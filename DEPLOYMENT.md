# Deployment guide — GitHub & Render

This document covers pushing the project to GitHub and deploying to Render so the app is live and database-backed.

---

## 1. Prepare for GitHub

### 1.1 What’s already in place

- **`.gitignore`** — Excludes `node_modules/`, `.env`, `.env.local`, logs, IDE/OS files.
- **No secrets in repo** — Use `.env` locally; never commit it. Render (or your host) provides env vars at runtime.
- **README, LICENSE (ISC), render.yaml** — Ready to commit.

### 1.2 Optional: add repository URL to package.json

After you create the GitHub repo, add (replace with your URL):

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/secure-access-system.git"
}
```

---

## 2. Push to GitHub

### 2.1 Create a new repository on GitHub

1. Go to [GitHub New Repository](https://github.com/new).
2. Name it (e.g. `secure-access-system`).
3. Do **not** initialize with README, .gitignore, or license (we already have them).
4. Create the repo and copy the **HTTPS** or **SSH** URL.

### 2.2 Initialize git and push (from project root)

```bash
cd secure-access-system

# Initialize and first commit
git init
git add .
git status   # ensure no .env or node_modules
git commit -m "Initial commit: Secure Access Management System"

# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/secure-access-system.git

# Push (main branch)
git branch -M main
git push -u origin main
```

If GitHub repo was created with a README, you may need:

```bash
git pull origin main --rebase
git push -u origin main
```

---

## 3. Deploy to Render

Two ways: **Blueprint (recommended)** or **manual**.

### 3.1 Option A — Blueprint (one-click from repo)

1. Go to [Render Dashboard](https://dashboard.render.com) and sign in (GitHub).
2. **New** → **Blueprint**.
3. Connect the GitHub repo that contains this project (with `render.yaml` in the root).
4. Render will detect `render.yaml` and create:
   - A **PostgreSQL** database (`secure-access-db`).
   - A **Web Service** (`secure-access-system`) with:
     - **Build Command:** `npm install && npx prisma generate`
     - **Start Command:** `npx prisma migrate deploy && npm start`
     - **Env:** `NODE_ENV=production`, `JWT_SECRET` (auto-generated), `DATABASE_URL` (from the created DB).
5. Click **Apply** and wait for the first deploy. The app URL will be like `https://secure-access-system-xxxx.onrender.com`.

**First admin user:** New DB is empty. Open the app → Register → then promote that user to ADMIN in the Render **Postgres** shell:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

(Render Dashboard → your database → Connect → run the SQL.)

### 3.2 Option B — Manual (Web Service + PostgreSQL)

1. **Create PostgreSQL**
   - **New** → **PostgreSQL**. Name e.g. `secure-access-db`, plan **Free**.
   - After creation, open the DB and copy the **Internal Database URL** (use this so the app and DB are in the same network).

2. **Create Web Service**
   - **New** → **Web Service**. Connect the same GitHub repo.
   - **Settings:**
     - **Build Command:** `npm install && npx prisma generate`
     - **Start Command:** `npx prisma migrate deploy && npm start`
     - **Instance type:** Free (or paid).
   - **Environment:**
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = (paste **Internal Database URL** from step 1)
     - `JWT_SECRET` = Generate a long random string (e.g. Render’s “Generate” or `openssl rand -base64 32`)
     - Optional: `JWT_EXPIRES_IN` = `15m`, `CORS_ORIGIN` = your frontend URL
   - Save and deploy.

3. **First deploy** will run migrations (from start command) then start the app. Use the service URL to open the app and register; promote first user to ADMIN via SQL as above.

---

## 4. After deployment

- **Health check:** `GET https://your-app.onrender.com/health` → 200 OK.
- **CORS:** If you host a separate frontend, set `CORS_ORIGIN` to that origin (e.g. `https://your-frontend.vercel.app`).
- **Free tier:** Service may spin down after inactivity; first request can be slow (cold start).
- **Logs:** Render Dashboard → your Web Service → Logs.

---

## 5. Summary checklist

| Step | Done |
|------|------|
| `.gitignore` excludes `.env` and `node_modules` | ✅ |
| No secrets committed | ✅ |
| `render.yaml` in repo for Blueprint | ✅ |
| Build: `npm install && npx prisma generate` | ✅ |
| Start: `npx prisma migrate deploy && npm start` | ✅ |
| Env: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV` | ✅ |
| Create GitHub repo and push | You |
| Deploy via Render Blueprint or manual | You |
| Create first admin via SQL | You |
