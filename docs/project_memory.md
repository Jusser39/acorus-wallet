# Project Memory

## Current status

- Monorepo scaffolded with `apps/web`, `apps/api`, `packages/shared`, `packages/wallet-core`
- EVM wallet-core implemented with local encrypted vault
- Fastify API implemented for public data flows
- Next.js PWA MVP screens implemented
- Practice wallet and view-only wallet flows implemented
- Root lint/test/build pass locally
- `docker compose config` passes, but full container smoke is blocked until Docker engine is running
- VPS deployment is live at `http://85.239.59.199:8080`

## Important decisions

- Fastify chosen over NestJS for MVP weight and speed
- Signing/decryption stay fully client-side
- MemoryStore is default API runtime until Prisma runtime enablement is finalized
- Google Fonts removed to keep builds offline-safe
- Docker stack includes Postgres/API/Web, but API defaults to MemoryStore unless `ACORUS_ENABLE_PRISMA_STORE=true`
- Web uses same-origin `/api/*` behind Nginx, and public ingress is on port `8080` because port `80` is already occupied by another application on the VPS
- Workspace package entrypoints were switched to `dist/index.js` so Docker runtime resolves built artifacts instead of raw `src/*`
- Fastify 5 requires `loggerInstance` for a custom pino logger, so API boot uses `loggerInstance` rather than passing the logger via `logger`

## Constraints

- No Solana/Tron runtime yet
- No WalletConnect / real swap / NFT module yet
- No backend seed storage, cloud seed backup, or custodial recovery
