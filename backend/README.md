# CompTool API

Express + MongoDB competency assessment backend.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Port **5020** by default. Seeds demo users/assessments on first start only.

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | public |
| POST | `/api/session/employee-code` | public until SSO is on |
| GET | `/api/demo/accounts` | demo only |
| GET | `/api/me` | any |
| GET | `/api/assessments/mine` | employee / manager |
| POST | `/api/assessments/:employeeId/self` | employee |
| POST | `/api/assessments/:employeeId/manager` | manager |
| GET | `/api/admin/assessments` | admin |
| POST | `/api/admin/reset` | admin (demo only) |

When `AUTH_DISABLED=true`, send `X-Demo-User-Id: emp-1` on every request. Turn this off before launch.

SSO: set `AZURE_TENANT_ID` + `AZURE_CLIENT_ID`, leave `AUTH_DISABLED` unset, and send a Microsoft Bearer token. That disables employee-code login.
