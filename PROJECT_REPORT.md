# Secure Access Management System — Project Report

**Report Date:** February 2026  
**Version:** 1.0.0  
**Scope:** Full-stack backend + minimal frontend for authentication, RBAC, and admin tooling.

---

## 1. Executive Summary

The **Secure Access Management System** is a production-style Node.js backend with JWT auth, role-based access control (USER/ADMIN), audit logging, and a minimal web UI. It uses Express, PostgreSQL (Prisma), bcrypt, Zod, and is containerized with Docker. The codebase is structured with a service layer, centralized error handling, and clear separation of concerns. It is **suitable for demos** and **deployment-ready** with some recommended hardening for high-stakes production.

---

## 2. Project Overview

### 2.1 Purpose

- Provide a **deployable SaaS-style backend** for access management.
- Demonstrate **auth (register/login)**, **RBAC**, **admin features**, and **audit logging**.
- Serve as a **foundation** for extending with more features (teams, permissions, SSO, etc.).

### 2.2 Scope

| In scope | Out of scope |
|----------|--------------|
| User registration & login | OAuth / social login |
| JWT access tokens (15m expiry) | Refresh tokens |
| USER + ADMIN roles | Fine-grained permissions |
| Admin: list users, change role, delete, audit logs | User self-service (password reset, profile edit) |
| Audit: login success/fail, role change, user delete, register | Full SIEM / log export |
| Docker + Render deployment path | Kubernetes / multi-region |
| Minimal HTML/CSS/JS frontend | SPA framework (React/Vue) |

---

## 3. Architecture

### 3.1 High-Level Flow

```
Client (browser) → Express → [CORS, Helmet, optional rate limit]
  → [Auth middleware: JWT verify, optional restrictTo(ADMIN)]
  → [Zod validation] → Controller → Service → Prisma → PostgreSQL
  → Response (JSON). Errors → global error middleware → JSON.
```

### 3.2 Backend Structure

| Layer | Responsibility | Files |
|-------|----------------|-------|
| **Routes** | Mount paths, apply rate limit & validation | `auth.routes`, `user.routes`, `admin.routes` |
| **Middleware** | Auth (protect, restrictTo), validation (Zod), global error | `auth.middleware`, `validate.middleware`, `error.middleware` |
| **Controllers** | HTTP in/out, delegate to services | `auth.controller`, `user.controller`, `admin.controller` |
| **Services** | Business logic (register, login, audit) | `auth.service` |
| **Config** | Env-based settings (port, JWT, CORS, etc.) | `config/env.js` |
| **Utils** | Shared DB client, AppError, catchAsync | `utils/db.js`, `AppError.js`, `catchAsync.js` |

Single **Prisma** client instance is used across the app to avoid connection-pool issues.

### 3.3 Database

- **PostgreSQL** via Prisma.
- **Tables:** `users` (id, name, email, password_hash, role, created_at, updated_at), `audit_logs` (id, user_id, action, details JSON, timestamp).
- **Migrations:** Versioned under `prisma/migrations`; applied at startup in Docker/Render via `prisma migrate deploy`.

### 3.4 Frontend

- **Static:** Served from `public/` (Express `express.static`).
- **Pages:** Landing (`index.html`), Login, Register, Dashboard, Admin.
- **Tech:** Vanilla HTML/CSS/JS; no build step; shared `api.js` for fetch + token handling.
- **Behavior:** Login/register → store JWT in `localStorage` → redirect by role (USER → dashboard, ADMIN can open admin panel). 401 from API triggers redirect to login.

---

## 4. Feature Summary

| Feature | Implementation | Notes |
|---------|----------------|------|
| **Registration** | POST `/api/auth/register`, bcrypt hash, role fixed to USER | Role from body ignored (no privilege escalation). |
| **Login** | POST `/api/auth/login`, JWT (15m), audit LOGIN_SUCCESS / LOGIN_FAIL | Failed login for unknown email logged with `user_id` null. |
| **Protected routes** | `protect` middleware (Bearer token, verify JWT, load user) | 401 on missing/invalid/expired token. |
| **Admin-only routes** | `restrictTo('ADMIN')` after `protect` | 403 for non-admin. |
| **Dashboard** | GET `/api/user/dashboard` | Returns current user info. |
| **Admin: list users** | GET `/api/admin/users` | No password_hash in response. |
| **Admin: change role** | PATCH `/api/admin/users/:userId/role`, body `{ role }` | Zod-validated; 404 if user missing. |
| **Admin: delete user** | DELETE `/api/admin/users/:userId` | Cannot delete self; 404 if user missing. |
| **Admin: audit logs** | GET `/api/admin/audit-logs` | Last 100 logs; includes user email relation. |
| **Health** | GET `/health` | 200 + timestamp for probes. |
| **Validation** | Zod on register, login, change-role | Structured 400 messages. |
| **Rate limiting** | express-rate-limit on `/api/auth/*` | 100 req / 15 min per IP; 429 with JSON body. |
| **Security headers** | Helmet | Default safe headers. |
| **CORS** | Configurable origin via `CORS_ORIGIN` | Default `*`; should be set in production. |

---

## 5. Security Posture

### 5.1 Strengths

- **Passwords:** Bcrypt with configurable rounds; never returned in API.
- **Tokens:** JWT with expiry (15m); expiry returns 401 with clear message.
- **Registration:** Role forced to USER; no client-controlled admin signup.
- **Input:** Zod validation on auth and admin payloads; reduces injection and bad data.
- **Errors:** Centralized handler; no stack traces or internals in production.
- **Audit:** Write-only logs for login (success/fail), role change, user delete, register; supports accountability.
- **Admin actions:** P2025 (not found) mapped to 404; no leaking of existence.

### 5.2 Considerations for Production

- **HTTPS:** Not implemented in-app; must be terminated at load balancer / reverse proxy (Render does this).
- **JWT secret:** Must be strong and secret; Render blueprint can generate.
- **CORS:** Set `CORS_ORIGIN` to the real frontend origin(s) in production (avoid `*` with credentials if strict).
- **Rate limit:** 100/15min is demo-friendly; consider stricter limits and/or captcha for public login.
- **Refresh tokens:** Not implemented; users re-login after 15m (acceptable for many internal/demo use cases).
- **.env / secrets:** Ensure `.env` is not committed; add/verify `.gitignore` (e.g. `.env`, `node_modules`).

---

## 6. Code Quality

- **Layering:** Clear split between routes, controllers, services, and DB.
- **Error handling:** Operational errors (AppError) vs unknown errors; consistent JSON shape.
- **Validation:** Centralized in middleware; Zod used for schema and error messages.
- **Reuse:** Single Prisma instance; shared auth and audit helpers.
- **Frontend:** Simple, no framework; XSS mitigated in admin panel (escapeHtml); API handles 204 and non-JSON errors safely.

---

## 7. Deployment Readiness

### 7.1 What’s in Place

| Item | Status |
|------|--------|
| **Dockerfile** | Multi-stage; Node 20 Alpine; non-root user; `prisma migrate deploy` then `node src/app.js` |
| **docker-compose.yml** | Postgres 16 + app; healthcheck; env for DB and JWT |
| **render.yaml** | Blueprint: web service + Postgres; buildCommand/startCommand and env (incl. generated JWT_SECRET) |
| **.env.example** | Documents required and optional vars |
| **README** | Architecture, API table, schema, RBAC, security, local + Docker + Render steps |

### 7.2 How to Deploy

- **Local / dev:** `docker compose up -d` or `npm run dev` with local Postgres and `.env`.
- **Render:** Create Postgres + Web Service (or use blueprint); set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`; build: `npm install && npx prisma generate`; start: `npx prisma migrate deploy && npm start`.

### 7.3 Gaps to Address Before Production

1. **.gitignore:** Add if missing (e.g. `node_modules`, `.env`, `.env.local`).
2. **JWT_SECRET:** Never default or commit; use platform secret manager or Render’s generated value.
3. **CORS_ORIGIN:** Set to the actual frontend origin in production.
4. **Health dependency:** `/health` does not check DB; for “readiness” you could add a lightweight DB check (e.g. `prisma.$queryRaw\`SELECT 1\``) and expose a separate `/ready` if needed.
5. **Logging:** Currently console; for production consider structured logging (e.g. JSON) and a log aggregator.

---

## 8. Demo Readiness

### 8.1 Why It Works Well for a Demo

- **One-command run:** `docker compose up -d` gives app + DB; open `http://localhost:3000`.
- **Clear flows:** Register → Login → Dashboard; promote a user to ADMIN (e.g. via DB or seed) → Admin panel (users, roles, delete, audit logs).
- **Visible security:** Auth, roles, and audit are evident in the UI and API; README explains them.
- **Professional look:** Branding (“Secure Access Management System”), minimal UI, no template clutter.
- **API-first:** All actions available via REST; easy to show with curl/Postman or a separate frontend.

### 8.2 Suggested Demo Script

1. Show landing page and login/register.
2. Register a user → redirect to dashboard; show token and profile.
3. (Optional) Promote that user to ADMIN in DB: `UPDATE users SET role = 'ADMIN' WHERE email = '...';`
4. Log in again → open Admin panel; show user list, change role, delete (e.g. a test user), then audit logs.
5. Show failed login → audit log entry for LOGIN_FAIL.
6. Show 401 (invalid/expired token) and 403 (USER on admin route).

---

## 9. Verdict

| Aspect | Verdict | Notes |
|--------|--------|--------|
| **Demo** | **Good** | Clear flows, one-command run, README and structure support a narrative. |
| **Deployment** | **Good** | Docker + Render path is in place; env-based config and migrations are production-friendly. |
| **Production (high security)** | **Conditional** | Solid base; add .gitignore, lock CORS/JWT_SECRET, optional DB health check and structured logging. |

**Bottom line:** The project is **suitable for demos and for deployment** (e.g. on Render or any Node + Postgres host). With the small hardening steps above, it can also serve as a **serious SaaS backend foundation** for further feature work.

---

## 10. File Inventory (Key Files)

```
secure-access-system/
├── prisma/schema.prisma          # Schema + enums
├── prisma/migrations/            # Init + add_user_name
├── src/
│   ├── app.js                    # Express app, routes, error handler
│   ├── config/env.js             # Env validation and config
│   ├── middlewares/               # auth, validate, error
│   ├── routes/                    # auth, user, admin
│   ├── controllers/              # auth, user, admin
│   ├── services/auth.service.js  # Register, login, createAuditLog
│   ├── validations/               # auth.schema, admin.schema
│   └── utils/                    # db (Prisma), AppError, catchAsync
├── public/                       # Static UI (HTML, CSS, JS)
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── .env.example
├── README.md
├── run-and-test.sh               # Optional API test script
└── PROJECT_REPORT.md             # This report
```

---

*End of report.*
