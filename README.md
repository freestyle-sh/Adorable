# Adorable ERP (starter scaffold)

This repo contains a starter scaffold for an ERP system using Node+TypeScript+Prisma+Postgres.

## Quick start

1. Copy `.env.example` to `backend/.env` and set secrets.
2. Run:
   ```bash
   make dev
## Running tests locally (fast)

This repo uses Jest + Supertest with Prisma-backed Postgres test DB.

### Quick (Linux/macOS)
1. Start Postgres & Redis (docker):
   `docker run -d --name adorable-pg -e POSTGRES_PASSWORD=erp_password -e POSTGRES_USER=erp -e POSTGRES_DB=erp_test -p 5432:5432 postgres:15`
   `docker run -d --name adorable-redis -p 6379:6379 redis:7`

2. In `backend/` set `DATABASE_URL=postgresql://erp:erp_password@localhost:5432/erp_test` in `.env`.

3. Install deps:
   `cd backend && npm ci`

4. Generate Prisma client:
   `npx prisma generate`

5. Apply migrations (if any) and seed test fixtures:
   `npx prisma migrate dev --name ci || true`
   `node prisma/seed_test.js`

6. Run tests with coverage:
   `npm run test:ci`

The CI replicates these steps automatically.
