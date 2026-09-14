# CompTool Frontend

```bash
cp .env.example .env
bun install
bun run dev
```

Open http://localhost:3020

- `VITE_USE_API=true` proxies `/api` → `http://localhost:5020`, signs in via employee code, and saves scores in Mongo.
- `VITE_SHOW_DEMO=true` shows demo accounts (keep off for launch).
- Microsoft sign-in button is still not wired. Azure keys on the backend are ready for when it is.
