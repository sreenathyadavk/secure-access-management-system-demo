# Secure Access Management System

A production-style, full-stack backend system with JWT authentication, role-based access control (RBAC), audit logging, and admin tooling. Built with Node.js, Express, PostgreSQL (Prisma), and Docker. Suitable as a SaaS backend foundation.

---

## Quick links

| | |
|---|---|
| **Run locally** | `docker compose up -d` → [http://localhost:3000](http://localhost:3000) |
| **Deploy to Render** | Push to GitHub → [Render Dashboard](https://dashboard.render.com) → New Web Service + PostgreSQL, or use **Blueprint** with `render.yaml` |
| **Environment** | Copy `.env.example` to `.env`; set `DATABASE_URL` and `JWT_SECRET` |

---

## Features

- **Authentication**: Register, login, JWT (15m expiry), bcrypt password hashing, token validation middleware
- **Role-Based Access**: `USER` and `ADMIN` roles; middleware-protected routes; admin-only endpoints
- **Protected Routes**: `/api/user/dashboard` (authenticated), `/api/admin/*` (admin only)
- **Admin Panel**: List users, change roles, delete users, view audit logs
- **Audit Logging**: Login success/failure, role changes, user deletion; details stored as JSON
- **Security**: Centralized error handling (no stack traces in prod), Zod validation, rate limiting, CORS, Helmet
- **Deployment**: Dockerfile, docker-compose, Render-compatible (render.yaml + build/start commands)

---

## System Architecture

```
                    +------------------+
                    |   Client (Web)   |
                    +--------+--------+
                             | HTTP/HTTPS
                             v
                    +------------------+
                    |  Express Server   |
                    +--------+--------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
  +-------------+    +-------------+    +------------------+
  |   CORS /    |    | Rate Limit  |    |  Auth Middleware  |
  |   Helmet    |    | (auth only) |    |  (JWT + roles)    |
  +-------------+    +-------------+    +------------------+
         |                   |                   |
         +-------------------+-------------------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
  +-------------+    +-------------+    +------------------+
  |   Zod       |    | Controllers |    |  Error Handler   |
  |   Validate  |    | (thin)      |    |  (centralized)    |
  +-------------+    +-------------+    +------------------+
         |                   |                   |
         v                   v                   v
  +-------------+    +-------------+    +------------------+
  |   Services  |    |  Prisma     |    |  Audit Log       |
  |   (logic)   |----|  Client     |----|  (write-only)    |
  +-------------+    +-------------+    +------------------+
                             |
                             v
                    +------------------+
                    |   PostgreSQL     |
                    +------------------+
```

**Request flow**: Request → CORS/Helmet → (optional) rate limit → (optional) auth/role middleware → validation → controller → service → Prisma → DB. Errors are caught by global error middleware and returned as structured JSON.

---

## Tech Stack

| Layer      | Technology        |
|-----------|-------------------|
| Backend   | Node.js, Express  |
| Database  | PostgreSQL        |
| ORM       | Prisma            |
| Auth      | JWT, bcrypt       |
| Validation| Zod               |
| Security  | Helmet, CORS, express-rate-limit |
| Frontend  | Vanilla HTML/CSS/JS (minimal, no Bootstrap) |

---

## Database Schema

### Table: `users`

| Column        | Type     | Description                |
|---------------|----------|----------------------------|
| id            | UUID     | Primary key                 |
| name          | String?  | Optional display name      |
| email         | String   | Unique                     |
| password_hash | String   | Bcrypt hash                |
| role          | Enum     | `USER` \| `ADMIN`          |
| created_at    | DateTime |                            |
| updated_at    | DateTime |                            |

### Table: `audit_logs`

| Column   | Type     | Description                          |
|----------|----------|-------------------------------------|
| id       | UUID     | Primary key                         |
| user_id  | UUID?    | Actor (null for e.g. unknown email) |
| action   | Enum     | LOGIN_SUCCESS, LOGIN_FAIL, ROLE_CHANGE, USER_DELETE, USER_REGISTER |
| details  | Json?    | Metadata (reason, targetUser, newRole, etc.) |
| timestamp| DateTime |                                      |

---

## API Endpoints

| Method | Endpoint                        | Auth   | Role  | Description              |
|--------|----------------------------------|--------|-------|--------------------------|
| GET    | `/health`                        | No     | —     | Health check (200 OK)    |
| POST   | `/api/auth/register`             | No     | —     | Register; returns JWT    |
| POST   | `/api/auth/login`                | No     | —     | Login; returns JWT       |
| GET    | `/api/user/dashboard`            | Bearer | USER+ | Current user dashboard   |
| GET    | `/api/admin/users`               | Bearer | ADMIN | List all users           |
| PATCH  | `/api/admin/users/:userId/role`  | Bearer | ADMIN | Change user role         |
| DELETE | `/api/admin/users/:userId`       | Bearer | ADMIN | Delete user              |
| GET    | `/api/admin/audit-logs`          | Bearer | ADMIN | Last 100 audit logs      |

All JSON. Errors return `{ status, message }`. Validation errors return 400 with a message; auth errors 401; forbidden 403.

---

## Role-Based Access

- **USER**: Can access `/api/user/dashboard` only. Sees own profile; no access to admin routes.
- **ADMIN**: Can access all user routes plus `/api/admin/*` (list users, change role, delete user, audit logs).

Authorization is enforced by middleware:

1. `protect`: Requires `Authorization: Bearer <token>`. Verifies JWT and loads `req.user`. Returns 401 if missing/invalid/expired.
2. `restrictTo('ADMIN')`: Runs after `protect`; returns 403 if `req.user.role !== 'ADMIN'`.

Admin routes use both: `router.use(protect); router.use(restrictTo('ADMIN'));`.

---

## Security Decisions

| Decision | Rationale |
|----------|-----------|
| **No stack traces in production** | Global error handler returns generic message for non-operational errors to avoid leaking internals. |
| **Zod validation** | All register/login and admin role payloads validated; meaningful 400 messages. |
| **Short-lived JWT (15m)** | Limits exposure of stolen tokens; 401 on expiry so client can re-login. |
| **Rate limiting on auth** | 100 req/15 min per IP on `/api/auth/*` to reduce brute-force risk. |
| **Bcrypt for passwords** | Industry standard; rounds configurable via `BCRYPT_ROUNDS`. |
| **CORS** | Configurable via `CORS_ORIGIN` (e.g. frontend origin in production). |
| **Audit log write-only** | No update/delete of audit records; supports accountability and forensics. |

---

## How Auth Works

1. **Register**: POST `/api/auth/register` with `email`, `password` (and optional `name`). Server hashes password, creates user (default role `USER`), writes `USER_REGISTER` audit log, returns JWT and user (no password).
2. **Login**: POST `/api/auth/login` with `email`, `password`. Server finds user, compares password with bcrypt; on failure writes `LOGIN_FAIL` (with or without user_id), returns 401; on success writes `LOGIN_SUCCESS`, returns JWT and user.
3. **Protected routes**: Client sends `Authorization: Bearer <token>`. Middleware verifies JWT (signature + expiry), loads user from DB, sets `req.user`. Expired token → 401 with message "Token expired. Please log in again."
4. **Admin routes**: Same as above, then `restrictTo('ADMIN')` checks `req.user.role`.

---

## Environment Variables

| Variable       | Required | Default   | Description                    |
|----------------|----------|-----------|--------------------------------|
| DATABASE_URL   | Yes      | —         | PostgreSQL connection string   |
| JWT_SECRET     | Yes      | —         | Secret for signing JWTs        |
| PORT           | No       | 3000      | Server port                    |
| NODE_ENV       | No       | development | development / production   |
| JWT_EXPIRES_IN | No       | 15m       | JWT expiry                     |
| BCRYPT_ROUNDS  | No       | 10        | Bcrypt cost                    |
| CORS_ORIGIN    | No       | *         | Allowed origin(s)              |

Copy `.env.example` to `.env` and set values. Do not commit `.env`.

---

## Local Development

### With Docker (recommended)

```bash
# Start PostgreSQL and app
docker-compose up -d

# App: http://localhost:3000
# DB: localhost:5432 (user app, password appsecret, db secure_access)
```

Migrations run on app startup. For a fresh DB, ensure a migration exists (see below).

### Without Docker

```bash
# Install
npm install

# DB (e.g. local PostgreSQL)
# Set DATABASE_URL in .env

# Migrations
npx prisma migrate dev

# Run
npm run dev
```

---

## Docker

- **Dockerfile**: Multi-stage; installs deps, runs `prisma generate`, then runs `prisma migrate deploy` and `node src/app.js`. Runs as non-root user.
- **docker-compose.yml**: Defines `db` (Postgres 16) and `app` (builds from Dockerfile). App depends on DB healthcheck. Use for local one-command run.
- **Migrations**: Applied at container start via `prisma migrate deploy`. For new projects, create an initial migration with `npx prisma migrate dev --name init` before building the image.

---

## Deployment on Render

1. **Create a PostgreSQL database** on Render (e.g. Free tier). Note the **Internal Database URL**.
2. **Create a Web Service** from this repo. Connect the repo and set:
   - **Runtime**: Node.
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Environment**:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = (Internal Database URL from step 1)
     - `JWT_SECRET` = long random string (Render can generate)
     - Optionally: `JWT_EXPIRES_IN`, `CORS_ORIGIN`
3. Deploy. Render runs build, then start; migrations run before the server starts.

Alternatively use **Render Blueprint**: add `render.yaml` to the repo and use Render’s blueprint flow to create the database and web service from the spec (see `render.yaml` in this repo).

---

## Project Structure

```
secure-access-system/
├── prisma/
│   └── schema.prisma       # DB schema and enums
├── public/                 # Static frontend
│   ├── css/style.css
│   ├── js/api.js, login.js, dashboard.js, admin.js
│   ├── index.html, login.html, register.html, dashboard.html, admin.html
├── src/
│   ├── config/env.js       # Environment-based config
│   ├── middlewares/
│   │   ├── auth.middleware.js   # protect, restrictTo
│   │   ├── error.middleware.js  # Global error handler
│   │   └── validate.middleware.js # Zod validation wrapper
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   ├── services/
│   │   └── auth.service.js # Register, login, createAuditLog
│   ├── validations/
│   │   ├── auth.schema.js
│   │   └── admin.schema.js
│   ├── utils/
│   │   ├── AppError.js
│   │   └── catchAsync.js
│   └── app.js              # Express app and server
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── .env.example
└── README.md
```

---

## Design Decisions

- **Service layer**: Business logic (auth, audit) lives in services; controllers stay thin and call services.
- **Centralized errors**: All errors go through one middleware; operational errors return safe messages; others return a generic 500 in production.
- **Role-based middleware**: `restrictTo(...roles)` keeps route definitions clear and avoids duplicating checks.
- **Audit logging**: Write-only, append-only logs with action + optional JSON details for traceability.
- **Prisma**: Single schema, type-safe client, and migrations for consistent DB evolution.

---

## License

ISC.
