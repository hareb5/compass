# CompTool Frontend

## Run (with backend)

```bash
cp .env.example .env   # VITE_USE_API=true
bun install
bun run dev
```

Start the backend first (see `../backend/README.md`). Open http://localhost:3020

## Run (mock only, no backend)

Set `VITE_USE_API=false` in `.env` and run `bun run dev`.

## API mode

Proxies `/api` → `http://localhost:5020`. Demo sign-in sends `X-Demo-User-Id` header when `AUTH_DISABLED=true` on the backend.
