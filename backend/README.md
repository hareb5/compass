# CompTool API

Express + MongoDB competency assessment backend.

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Port **5020** by default. Demo users are seeded only when `AUTH_DISABLED=true` and the database is empty.

Employee-code login upserts the person, their manager, their team, and blank assessments into Mongo. Scores submitted from the app are stored there. Admin reads the same records.

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | public |
| POST | `/api/session/employee-code` | public (returns `accessToken`) |
| GET | `/api/demo/accounts` | demo only |
| GET | `/api/me` | any |
| GET | `/api/assessments/mine` | employee / manager |
| POST | `/api/assessments/:employeeId/self` | employee |
| POST | `/api/assessments/:employeeId/manager` | manager |
| GET | `/api/admin/assessments` | admin |
| POST | `/api/admin/reset` | admin (demo only) |

`AUTH_DISABLED=true`: send `X-Demo-User-Id` (seeded demo ids).  
`AUTH_DISABLED=false`: send the `accessToken` from employee-code login as `Authorization: Bearer …`. Microsoft JWTs are also accepted once Azure keys are set (MSAL button still to come).

List admin codes in `ADMIN_EMPLOYEE_CODES` (and/or `ADMIN_EMAILS`).
