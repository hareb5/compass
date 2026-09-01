# SOBHA COMPASS

Competency mapping and skill assessment system — frontend + backend.

## Structure

```
comptool/
  frontend/   React + TanStack Start (port 3020)
  backend/    Express + MongoDB (port 5020)
```

## Quick start

```bash
# Backend (optional when VITE_USE_API=false)
cd backend && npm install && npm run dev

# Frontend
cd frontend && bun install && bun run dev
```

Open http://localhost:3020 — enter an **employee code**, or pick a demo account.

### Org directory env (`frontend/.env`)

```
VITE_USE_API=false
VITE_URL_API=https://your-org-api/employees
VITE_API_KEY=your-bearer-token
```

Restart Vite after changing env. Lookup uses `employees[]` fields `EMPLOYEE_CODE`, `EMPLOYEE_NAME`, `L1_MANAGER_CODE`, `L1_MANAGER_NAME`, `EmpStatus`:
- code appears as someone’s `L1_MANAGER_CODE` → **manager** (scores **Active** reports only; `Inactive` hidden)
- otherwise → **employee** (self-score only)

SSO will later feed the same employee-code path (`signInWithEmployeeCode`).

## Roles

- **Employee** — self-score 1–5 (40%)
- **Manager** — score reports 1–5 (60%)
- **Admin** — see both + weighted final
