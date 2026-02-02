# Production Pending Actions (What local code cannot prove)

This document lists the items that remain **deployment/production responsibilities**. They cannot be “fully completed” inside the repo because they require real infrastructure (SMTP provider, secret storage, production DB, DNS, etc.).

---

## 1) Real SMTP provider credentials (Production)

### What is already done

- SMTP smoke test tooling exists: `backend/test-smtp-send.ts` (`npm run test:smtp`)
- A test send was verified using a test SMTP provider during development.

### What is still pending (production)

You must configure a real SMTP provider on the production environment (Gmail app password, SendGrid, Mailgun, SES, etc.):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `ADMIN_EMAIL`

Then run (on the deployment host):

- `cd backend`
- `npm run test:smtp`

**Why this is production-only:** credentials must be owned by the client/org, stored securely, and never committed to Git.

---

## 2) Generate/rotate production secrets (JWT + cookies)

### Secrets that must be unique per environment

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`

### How to generate (recommended)

Use the existing scripts:

- `scripts/generate-secrets.ps1` (Windows)
- `scripts/generate-secrets.sh` (Linux/macOS)

Or generate with Node:

- `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### Rotation note

Rotating `JWT_SECRET` / `JWT_REFRESH_SECRET` will invalidate existing sessions/tokens (expected). Plan a maintenance window if users are active.

**Why this is production-only:** secrets must be generated and stored in a secure secret manager (or hosting env vars), not in the repository.

---

## 3) Production database decision (SQLite vs Postgres/MySQL)

### Best choice (recommended): PostgreSQL

If you don’t already have a production database, **PostgreSQL** is the best default choice here because:

- strong reliability & concurrency
- excellent ecosystem and managed hosting options
- Prisma works very well with Postgres

Recommended managed Postgres providers (examples):

- Supabase / Neon / Railway / Render / AWS RDS / DigitalOcean Managed DB

### Included in this project (easy local/prod-like setup)

This repo includes a `docker-compose.yml` with:

- PostgreSQL (recommended DB)
- Redis (recommended for distributed rate limiting)
- Backend + Frontend containers

To run it safely, copy `.env.docker.example` to `.env` at the repo root and fill in strong secrets.

### What the repo currently does

- Local dev/test uses **SQLite** via `backend/prisma/schema.prisma`.

### Production on PostgreSQL (supported via separate Prisma schema)

This repo includes:

- `backend/prisma/schema.postgres.prisma`

On the deployment host (or CI build step), run:

1. Set `DATABASE_URL` to your Postgres connection string
2. `cd backend`
3. `npm ci` (or `npm install`)
4. `npm run prisma:generate:pg`
5. `npm run prisma:deploy:pg` (uses `prisma db push`)
6. `npm run prisma:seed:pg` (optional)
7. `npm run build`
8. `npm start`

**Note (important):** the existing Prisma migrations in this repo were generated for SQLite dev.
For a mixed setup (SQLite dev, PostgreSQL production), `prisma db push` is the safest path.
If you want full migration-based workflows on PostgreSQL, the repo should be switched to PostgreSQL as the primary provider and migrations regenerated accordingly.

### If you stay on SQLite in production (not recommended)

It can work for single-instance, low-traffic deployments, but you must be careful with:

- file persistence/backups
- concurrency/locking
- scaling beyond one instance

**Why this is production-only:** the “best” DB depends on hosting constraints, budget, scaling needs, and operational maturity.
