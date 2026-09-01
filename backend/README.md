# CompTool API

Express + MongoDB competency assessment backend.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Port **5020** by default. Seeds demo users/assessments on first start.

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | public |
| GET | `/api/demo/accounts` | demo only |
| GET | `/api/me` | any |
| GET | `/api/assessments/mine` | employee / manager |
| POST | `/api/assessments/:employeeId/self` | employee |
| POST | `/api/assessments/:employeeId/manager` | manager |
| GET | `/api/admin/assessments` | admin |
| POST | `/api/admin/reset` | admin (demo only) |

When `AUTH_DISABLED=true`, send `X-Demo-User-Id: emp-1` (etc.) on every request.
