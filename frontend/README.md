# CompTool Frontend

```bash
cp .env.example .env
bun install
bun run dev
```

Open http://localhost:3020

- `VITE_USE_API=true` proxies `/api` → `http://localhost:5020`, signs in via Microsoft SSO or employee code, and saves scores in Mongo.
- `VITE_SHOW_DEMO=true` shows demo accounts (keep off for launch).
- Microsoft SSO needs `VITE_MSAL_CLIENT_ID`, `VITE_MSAL_TENANT_ID`, and `VITE_MSAL_REDIRECT_URI` in `.env` (dev) or `.env.production.local` (build). Backend `AZURE_*` keys do not reach the browser.
