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

## 2. Production — SSO + Mongo (not finished)

Backend already checks a Microsoft token and loads the user from Mongo by **email**. The frontend does **not** yet open the Microsoft sign-in popup. Env keys alone will not make the button work.

### One-time setup (Azure + server)

1. Create an App Registration in Azure AD (same tenant as company Microsoft login).
2. Add the production URL as a redirect URI (single-page / SPA).
3. Put real people in Mongo (`email` must match their Microsoft email, plus `employeeCode`, `role`, manager link).
4. On the **server** (not in `frontend/.env` for secrets):

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
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_ALLOWED_EMAIL_DOMAINS=sobha.com
REQUIRE_HTTPS=true
TRUST_PROXY=true
```

5. Host frontend as HTTPS static files, backend as the Node API, proxy `/api` to the backend.

### Still to build in this repo (then deploy that same code)

- Microsoft sign-in button (MSAL).
- After login, send the Microsoft token on `/api` calls (the API already expects that).
- After login works, map the Microsoft user to `employeeCode` if email is not enough.

Do this work in the project once, then deploy. You do not repeat token steps on the server.

---

## Roles

- Employee — self-score 1–5 (40%)
- Manager — score reports 1–5 (60%)
- Admin — see both + weighted final
