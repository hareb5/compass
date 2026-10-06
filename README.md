# SOBHA COMPASS

Frontend (port 3020) + backend (port 5020).

You never paste tokens anywhere. Microsoft login saves the token in the browser by itself, then the app sends it to the API. That is not a deploy step.

---

## 1. Local — no SSO, no database

Only the frontend. Demo people, scores stay in this browser.

**`frontend/.env`**

```
VITE_USE_API=false
VITE_SHOW_DEMO=true
VITE_APP_URL=http://localhost:3020
```

```bash
cd frontend
bun install
bun run dev
```

Open http://localhost:3020 and click a demo account. Do not start Mongo or the backend.

---

## 2. API + Mongo (employee code or Microsoft SSO)

Set `VITE_USE_API=true` and `AUTH_DISABLED=false`. People can sign in with Microsoft (MSAL) or employee code. The API loads the org directory, saves boss/team links in Mongo, and stores scores so admin can see them.

Frontend Microsoft login reads **`VITE_MSAL_CLIENT_ID`** and **`VITE_MSAL_TENANT_ID`** (not `AZURE_*`). Backend still uses `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` to verify the same app.

**Frontend build env**

```
VITE_USE_API=true
VITE_SHOW_DEMO=false
VITE_APP_URL=https://your-domain
VITE_MSAL_CLIENT_ID=...
VITE_MSAL_TENANT_ID=...
VITE_MSAL_REDIRECT_URI=https://your-domain
```

**Backend env**

```
NODE_ENV=production
MONGO_URI=...
CORS_ORIGIN=https://your-domain
AUTH_DISABLED=false
SESSION_SECRET=...
ORG_API_URL=...
ORG_API_KEY=...
ADMIN_EMPLOYEE_CODES=...
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_ALLOWED_EMAIL_DOMAINS=sobha.com
REQUIRE_HTTPS=true
TRUST_PROXY=true
```

Host frontend as HTTPS static files, backend as the Node API, proxy `/api` to the backend.

---

## Roles

- Employee — self-score 1–5 (40%)
- Manager — score reports 1–5 (60%)
- Admin — see both + weighted final
