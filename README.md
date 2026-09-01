# xp COMPASS

Competency mapping and skill assessment system — frontend + backend.

## Structure

```
comptool/
  frontend/   React + TanStack Start (port 3020)
  backend/    Express + MongoDB (port 5020)
```

## Quick start (API mode)

**Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Requires MongoDB at `mongodb://127.0.0.1:27017/comptool` (or set `MONGO_URI`).

**Frontend**
```bash
cd frontend
cp .env.example .env
bun install
bun run dev
```

Open http://localhost:3020 — pick a demo account.

## Mock-only mode (no backend)

Set `VITE_USE_API=false` in `frontend/.env` and run the frontend only.

## Roles

- **Employee** — self-score 1–5 (40% weight); cannot see manager scores
- **Manager** — score reports 1–5 (60% weight); cannot see self-scores
- **Admin** — see both + weighted final

Final = manager avg × 60% + employee avg × 40%

## Auth

- Local demo: `AUTH_DISABLED=true` + `X-Demo-User-Id` header (handled by frontend)
- Production: Microsoft SSO via same pattern as talent (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`)

## Org hierarchy

Seeded in Mongo now. `orgHierarchy.syncFromExternal()` is stubbed for a future line-manager API.
