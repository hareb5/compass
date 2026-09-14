# SOBHA COMPASS

Frontend (port 3020) + backend (port 5020).

You never paste tokens anywhere. Microsoft login (when we add the button) saves the token in the browser by itself, then the app sends it to the API. That is not a deploy step.

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

## 2. API + Mongo (employee code now, Microsoft button later)

Set `VITE_USE_API=true` and `AUTH_DISABLED=false`. People sign in with employee code. The API loads the org directory, saves boss/team links in Mongo, and stores scores so admin can see them.

Microsoft SSO keys can sit in backend env now; the login **button** is still not in the frontend. When that is added, the same API will accept the Microsoft token and map email → employee code.

**Frontend build env**

```
VITE_USE_API=true
VITE_SHOW_DEMO=false
VITE_APP_URL=https://your-domain
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
