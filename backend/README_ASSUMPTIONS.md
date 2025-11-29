
---

# How to use these files (what to paste where)
1. Create folders: `backend/`, `frontend/` (frontend scaffold not included here; add your React app inside `frontend/`).
2. Paste the files where specified:
   - `docker-compose.yml`, `Makefile`, `README.md` at repo root.
   - Backend-related files under `backend/` (Dockerfile, package.json, .env, prisma/, src/).
   - GitHub workflow under `.github/workflows/ci.yml`.
3. From repo root run:
```bash
# prepare
cp backend/.env backend/.env.local # update secrets if needed

# bring up services
make dev
# in separate terminal (or after containers up)
make migrate
make seed

