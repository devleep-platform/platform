# Devleep — Platform

Private monorepo for the Devleep platform. The public lab definitions live in [devleep-platform/labs](https://github.com/devleep-platform/labs).

## What's in here

| Directory | What it is |
|---|---|
| `app/` | Next.js 14 App Router frontend (TypeScript) |
| `components/` | Shared React components |
| `lib/` | API clients, Zustand stores, utilities |
| `backend/` | Fastify API (Node.js, TypeScript) |
| `worker/` | Provisioning worker (Go, River queue) |
| `workers/` | Cloudflare Worker (terminal WebSocket proxy) |
| `terraform/` | OpenTofu modules for lab infrastructure |
| `.github/workflows/` | CI/CD pipelines |

## Stack

- **Frontend**: Next.js 14 App Router · TypeScript · Tailwind · Zustand · xterm.js
- **API**: Fastify · PostgreSQL (Neon) · JWT auth
- **Worker**: Go · River queue · SSH2 · OpenTofu
- **CF Worker**: Cloudflare Durable Objects (WebSocket terminal relay)
- **Infra**: Azure Container Apps · Azure Container Registry · Cloudflare Pages

## Local development

```bash
# Frontend
npm install
npm run dev

# API
cd backend && npm install && npm run dev

# Worker
cd worker && go run ./cmd/worker
```

Environment variables: copy `.env.local.example` to `.env.local` and fill in the values.

## Deployment

Deployments are automated via GitHub Actions on push to `main`. See `.github/workflows/` for the full pipeline.

Manual rebuild (emergency):
```bash
# API
az acr build --registry devopslabprod --image api:latest backend/

# Worker
az acr build --registry devopslabprod --image worker:latest worker/

# Frontend
npm run build && npx wrangler pages deploy out --project-name devleep
```

## Lab definitions

Labs are maintained in the public [devleep-platform/labs](https://github.com/devleep-platform/labs) repo. On merge to main there, the CI calls `POST /admin/labs/sync` on this API and the lab goes live automatically.
