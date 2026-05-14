# Action Memory

## Executed actions

1. Checked VPS access and detected that Node/pnpm/docker are not installed there yet.
2. Created local workspace at `C:\Users\NZXT\acorus-wallet`.
3. Installed pnpm and scaffolded Next.js app plus monorepo structure.
4. Implemented shared package with chain configs, token metadata, DTOs, and practice lessons.
5. Implemented wallet-core with mnemonic helpers, local vault encryption/decryption, EVM helpers, and unit tests.
6. Implemented Fastify API with anonymous users, wallet profiles, contacts, transactions, chains, tokens, prices stub, logger redaction tests, and MemoryStore default runtime.
7. Implemented Next.js onboarding, create/import/unlock, dashboard, send, history, contacts, settings, view-only, practice, PWA manifest, and service worker.
8. Added Dockerfiles, docker-compose, nginx example, README, and architecture/security/api docs.
9. Ran root lint/test/build, `tsx scripts/dev_check.ts`, and `docker compose config`.
10. Attempted `docker compose up --build`, but local Docker engine was not running (`dockerDesktopLinuxEngine` pipe unavailable).
11. Switched Docker deployment flow to same-origin API via Nginx and added Docker build args for `NEXT_PUBLIC_*`.
12. Bootstrapped VPS `85.239.59.199`: installed Docker Engine + compose plugin and prepared `/opt/acorus-wallet`.
13. Uploaded Acorus Wallet source bundle and production `.env` to `/opt/acorus-wallet`.
14. Attempted Prisma-backed container deployment, but Prisma client generation remained blocked inside the Docker/pnpm build path, so runtime was switched to `MemoryStore` for the live deployment.
15. Fixed Docker runtime resolution by changing `@acorus/shared` and `@acorus/wallet-core` package entrypoints to `dist/index.js`.
16. Fixed Fastify 5 boot by wiring the custom pino logger through `loggerInstance`.
17. Moved Acorus public ingress to port `8080` because port `80` was already occupied on the VPS by another application.
18. Rebuilt the VPS stack and confirmed live responses for `/`, `/health`, and `/api/chains` at `http://85.239.59.199:8080`.

## Commands run

- `corepack enable`
- `corepack prepare pnpm@10.11.0 --activate`
- `pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --use-pnpm --import-alias '@/*' --yes`
- `pnpm add -Dw ...`
- `pnpm --filter @acorus/wallet-core lint`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/wallet-core build`
- `pnpm --filter @acorus/api lint`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web lint`
- `pnpm --filter @acorus/web build`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm exec tsx scripts/dev_check.ts`
- `docker compose -f infra/docker-compose.yml config`
- `docker compose -f infra/docker-compose.yml up -d --build`
- `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- `docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis api web nginx`
- `docker compose --env-file .env -f infra/docker-compose.yml logs --tail=... api nginx web`

## Current follow-up

- Run full workspace tests and builds end-to-end
- Stabilize Prisma-backed Postgres runtime inside Docker so contacts/history survive container recreation
- Decide whether to reserve a dedicated domain or reverse proxy path instead of raw IP:port access
