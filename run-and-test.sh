#!/bin/bash
# Run server with test DB and run API tests
set -e
cd "$(dirname "$0")"

export DATABASE_URL="postgresql://app:appsecret@localhost:5432/secure_access"
export JWT_SECRET="test-secret-at-least-32-chars-long"

# Ensure port is free
pkill -f "node src/app.js" 2>/dev/null || true
sleep 1

# Start server in background
node src/app.js &
PID=$!
trap "kill $PID 2>/dev/null || true" EXIT

# Wait for server (up to 10s)
for i in $(seq 1 10); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null | grep -q 200; then
    echo "Server ready."
    break
  fi
  [ $i -eq 10 ] && (echo "Server did not become ready."; exit 1)
  sleep 1
done

# Tests
echo "=== 1. GET /health ==="
curl -s http://localhost:3000/health
echo ""

echo "=== 2. POST /api/auth/register ==="
REG=$(curl -s -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123","name":"Admin User"}')
echo "$REG" | head -c 300
echo ""
if ! echo "$REG" | grep -q '"token"'; then echo "FAIL: no token"; exit 1; fi
TOKEN=$(echo "$REG" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "OK: got token"

echo "=== 3. GET /api/user/dashboard (with token) ==="
DASH=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/user/dashboard)
echo "$DASH" | head -c 300
echo ""
echo "$DASH" | grep -q '"status":"success"' && echo "OK" || (echo "FAIL"; exit 1)

echo "=== 4. POST /api/auth/login ==="
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123"}')
echo "$LOGIN" | head -c 300
echo ""
echo "$LOGIN" | grep -q '"token"' && echo "OK" || (echo "FAIL"; exit 1)

echo "=== 5. Register second user (will need admin to promote) ==="
REG2=$(curl -s -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"user@test.com","password":"password123"}')
echo "$REG2" | head -c 200
echo ""
echo "$REG2" | grep -q '"token"' && echo "OK" || (echo "FAIL"; exit 1)

# Promote first user to ADMIN via DB for admin tests (or we need an existing admin)
# Instead: get admin token from login, then call admin endpoints. But first user is USER role.
# So we need to either seed an admin or promote via direct DB. Use prisma to set admin.
echo "=== 6. Promote admin@test.com to ADMIN (via DB) ==="
docker exec secure-access-system-db-1 psql -U app -d secure_access -t -c "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';" 2>/dev/null || true
echo "OK"

echo "=== 7. Login as admin, GET /api/admin/users ==="
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123"}')
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
USERS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/admin/users)
echo "$USERS" | head -c 400
echo ""
echo "$USERS" | grep -q '"status":"success"' && echo "OK" || (echo "FAIL"; exit 1)

echo "=== 8. GET /api/admin/audit-logs ==="
LOGS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/admin/audit-logs)
echo "$LOGS" | head -c 400
echo ""
echo "$LOGS" | grep -q '"status":"success"' && echo "OK" || (echo "FAIL"; exit 1)

echo "=== 9. Invalid token -> 401 ==="
INVALID=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid" http://localhost:3000/api/user/dashboard)
[ "$INVALID" = "401" ] && echo "OK (401)" || (echo "FAIL got $INVALID"; exit 1)

echo "=== 10. Validation: short password -> 400 ==="
VAL=$(curl -s -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"short"}')
echo "$VAL" | head -c 300
echo ""
echo "$VAL" | grep -q 'Validation failed' && echo "OK" || (echo "FAIL"; exit 1)

echo ""
echo "All tests passed."
