# CompTool Frontend

```bash
cp .env.example .env
bun install
bun run dev
```

Open http://localhost:3020

- `VITE_USE_API=true` proxies `/api` → `http://localhost:5020` and uses backend employee-code lookup.
- `VITE_SHOW_DEMO=true` shows demo accounts (keep off for launch).
- `VITE_USE_API=true` is **not** Microsoft SSO. SSO needs Azure env on the backend plus MSAL on this app.
