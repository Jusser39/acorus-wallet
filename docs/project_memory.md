# Project Memory

## Current status

- Monorepo scaffolded with `apps/web`, `apps/api`, `packages/shared`, `packages/wallet-core`
- EVM wallet-core implemented with local encrypted vault
- Fastify API implemented for public data flows
- Next.js PWA MVP screens implemented
- Practice wallet and view-only wallet flows implemented
- Root lint/test/build pass locally
- `docker compose config` passes, but full container smoke is blocked until Docker engine is running

## Important decisions

- Fastify chosen over NestJS for MVP weight and speed
- Signing/decryption stay fully client-side
- MemoryStore is default API runtime until Prisma runtime enablement is finalized
- Google Fonts removed to keep builds offline-safe
- Docker stack includes Postgres/API/Web, but API defaults to MemoryStore unless `ACORUS_ENABLE_PRISMA_STORE=true`

## Constraints

- No Solana/Tron runtime yet
- No WalletConnect / real swap / NFT module yet
- No backend seed storage, cloud seed backup, or custodial recovery
