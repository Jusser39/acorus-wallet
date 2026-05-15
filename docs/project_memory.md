# Project Memory

## Current status

- Monorepo scaffolded with `apps/web`, `apps/api`, `packages/shared`, `packages/wallet-core`
- EVM wallet-core implemented with local encrypted vault
- Fastify API implemented for public data flows
- Next.js PWA MVP screens implemented
- Practice wallet and view-only wallet flows implemented
- Root lint/test/build pass locally
- VPS deployment is live at `http://85.239.59.199:8080`
- Prisma/PostgreSQL persistence is live on VPS; API health reports `store: "prisma"`
- MemoryStore remains available only as a fallback when `ACORUS_ENABLE_PRISMA_STORE=false`

## Important decisions

- Fastify chosen over NestJS for MVP weight and speed
- Signing/decryption stay fully client-side
- Prisma runtime is enabled by `ACORUS_ENABLE_PRISMA_STORE=true`; Docker entrypoint waits for Postgres and applies `prisma db push` before API boot
- Prisma CLI is declared directly in `apps/api` so `prisma generate` resolves correctly inside the workspace and Docker build
- Google Fonts removed to keep builds offline-safe
- Docker stack includes Postgres/Redis/API/Web/Nginx healthchecks so API does not race Postgres during restarts
- Web uses same-origin `/api/*` behind Nginx, and public ingress is on port `8080` because port `80` is already occupied by another application on the VPS
- Workspace package entrypoints were switched to `dist/index.js` so Docker runtime resolves built artifacts instead of raw `src/*`
- Fastify 5 requires `loggerInstance` for a custom pino logger, so API boot uses `loggerInstance` rather than passing the logger via `logger`
- Shell scripts are normalized to LF and guarded by `.gitattributes` so Docker entrypoints do not break on Linux with `bash\\r`

## Constraints

- No Solana/Tron runtime yet
- No WalletConnect / real swap / NFT module yet
- No backend seed storage, cloud seed backup, or custodial recovery

## Security hardening wave

- Date: `2026-05-15`
- Current public URL remains `http://85.239.59.199:8080`
- Port `8080` remains intentional because port `80` is occupied on the VPS
- Backend store remains `prisma`
- Passed checks: git secret scan, docs scan, VPS docker log scan, logger redaction audit, API route audit, API test/build, root test/build, Prisma generate, shell syntax checks, VPS health checks, VPS persistence create+verify across `restart api`, PostgreSQL backup smoke run
- Added documents: `docs/security_audit_report.md`, `docs/deployment_hardening.md`
- Added scripts: `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`
- `scripts/check-persistence.sh` now writes `tmp/persistence-check.json` so the same created entities can be revalidated after restart
- Remaining risks: root password must be rotated manually, SSH key auth and password-login disablement are still manual follow-up steps, HTTP-only IP deployment is not suitable for real production, local Docker regression is still blocked until the local Docker engine is running
- Root password rotation is required before treating the VPS as trusted again
- HTTPS is required before any real-user or mainnet launch
- Next step: provision domain + HTTPS, then lock down `CORS_ORIGIN` and SSH access before the next product wave

## EVM Wallet UX + Send Flow Wave

- Date: `2026-05-15`
- Current deployment for this wave remains `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document added at `docs/evm_wallet_ux_send_flow_plan.md`
- Final report added at `docs/evm_wallet_ux_send_flow_report.md`
- Implemented routes/screens now include dedicated `/receive` in addition to landing, create, import, unlock, wallet, send, history, contacts, settings, view-only, and practice
- Frontend improvements shipped:
  - import now requires confirm-passcode
  - local vault parsing is version-aware
  - unsupported/corrupted vault state surfaces safely in the UI
  - inactivity autolock and hidden-tab autolock are active
  - wallet nav exposes receive and surfaces bootstrap/storage errors
  - dashboard can refresh balances, toggle hidden balance, and disables send for view-only
  - receive, contacts, send, history, settings, view-only, and practice flows were upgraded
- Wallet-core improvements shipped:
  - stable EVM account derivation helper
  - explorer URL builders
  - native/ERC-20 fee estimation helpers
  - stronger EVM address validation
  - explicit unsupported-vault-version handling
- Backend/API improvements shipped:
  - typed web client methods for chains/tokens/onboarding progress
  - backend rejection of sensitive request fields such as mnemonic/privateKey/passcode
  - workspace package prebuild/pretest hooks so filtered package commands use fresh shared artifacts
- Validation completed for this wave:
  - `pnpm --filter @acorus/wallet-core test`
  - `pnpm --filter @acorus/api test`
  - `pnpm --filter @acorus/api build`
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
  - `docker compose --env-file .env -f infra/docker-compose.yml config`
  - VPS health + persistence create/verify + restart verify
- Local Docker compose build/up regression remains environment-blocked on this workstation because `dockerDesktopLinuxEngine` is unavailable
- VPS rollout succeeded after repairing a drift between the persisted PostgreSQL password and the current `.env` placeholder password, then recreating the `api` container
- This wave still keeps the non-custodial boundary unchanged: backend stores only public data and never receives mnemonic/private-key/passcode material
- Commit hash: pending final commit
