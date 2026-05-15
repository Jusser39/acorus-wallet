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
19. Added Prisma-ready API runtime pieces: parsed env booleans, `close()` lifecycle for stores, onboarding progress endpoints, PostgreSQL healthchecks, and Docker entrypoint that waits for Postgres and runs `prisma generate` + `prisma db push`.
20. Fixed Prisma workspace generation by declaring `prisma` directly in `apps/api`, then revalidated `prisma generate`, API tests, API build, web build, and `docker compose config`.
21. Switched VPS `.env` to `ACORUS_ENABLE_PRISMA_STORE=true` without exposing or replacing the existing Postgres secret.
22. Hit a Linux runtime blocker caused by CRLF line endings in `scripts/docker/api-entrypoint.sh` (`bash\\r`), normalized shell scripts to LF, and added `.gitattributes` with `*.sh text eol=lf`.
23. Rebuilt the VPS stack, confirmed `/health` reports `store: "prisma"`, and verified that wallet profiles, contacts, transactions, and onboarding progress survive `docker compose restart api`.
24. Performed a read-only hardening audit across local git state, tracked files, VPS compose state, masked env values, and Docker logs without printing live secrets.
25. Verified the exact compromised root password is absent from both the current worktree and git history, while `.env` remains untracked and secret hits in tracked files are limited to safe placeholders/docs/test coverage.
26. Expanded API logger redaction for `DATABASE_URL`, `POSTGRES_PASSWORD`, `authorization`, `cookie`, and `set-cookie`-style fields, then extended logger tests accordingly.
27. Hardened API error handling so parser/validation failures return sanitized client errors instead of leaking raw internal messages, and added regression coverage for empty JSON body handling.
28. Added optional `CORS_ORIGIN` env support with safe empty-value parsing, preserving permissive fallback only for the current IP-based dev-public deployment.
29. Fixed the frontend anonymous-user bootstrap flow by avoiding `Content-Type: application/json` on body-less requests, which removed the public `POST /api/users/anonymous` failure path.
30. Upgraded `scripts/check-persistence.sh` to write `tmp/persistence-check.json` and support `CHECK_MODE=verify` for post-restart validation of the same created records.
31. Added `scripts/backup-postgres.sh` and guarded `scripts/restore-postgres.sh`, then ran a real backup on the VPS into `/opt/acorus-wallet/backups/postgres`.
32. Rebuilt `api` and `web` on the VPS, confirmed local/public health at `:8080`, re-ran full persistence creation + verification, restarted `api`, and re-verified the same wallet/contact/transaction/onboarding ids after restart.
33. Added `docs/security_audit_report.md` and `docs/deployment_hardening.md`, and updated project memory for the security hardening wave.
34. Started the product wave for `EVM Wallet UX + Send Flow` with a read-only audit across current web routes, wallet-core helpers, Zustand wallet session, API persistence shape, and VPS health.
35. Confirmed the current frontend already contains create/import/unlock/wallet/send/history/contacts/settings/view-only/practice routes, but identified product gaps: no dedicated receive route, import lacks confirm-passcode UX, send flow is still skeleton-grade, contacts do not validate EVM addresses, and view-only creation does not validate address input.
36. Added `docs/evm_wallet_ux_send_flow_plan.md` with scope, flows, wallet states, security boundaries, testing plan, and deployment plan for the next implementation steps.
37. Extended shared and wallet-core foundations with send asset types, explorer helpers, fee-estimate helpers, version-aware vault parsing, stronger address validation, and extra unit coverage.
38. Upgraded frontend session/storage behavior with explicit vault parsing, legacy decrypted-session cleanup, inactivity autolock, hidden-tab autolock, and wallet-level error surfacing.
39. Expanded the web API client with typed chains/tokens/onboarding helpers and friendlier API error parsing.
40. Added product UX improvements across `/receive`, `/wallet`, `/send`, `/history`, `/contacts`, `/settings`, `/view-only`, and `/practice`, including view-only send blocking, receive QR flow, contact validation, multi-step send review/final confirmation, explorer links, status refresh, safety-mode UX, and practice onboarding persistence.
41. Hardened backend request boundaries by rejecting sensitive fields such as `mnemonic`, `privateKey`, and `passcode` on API write routes, then added regression coverage.
42. Added web-side tests for same-origin API paths, send-policy guards, storage helpers, and wallet-store lock cleanup, and added package prebuild/pretest hooks so filtered builds/tests use fresh workspace package artifacts.
43. Re-ran local validation: wallet-core/api/web tests, api/web builds, root `pnpm test`, root `pnpm build`, and `git diff --check`.
44. Confirmed local `docker compose --env-file .env -f infra/docker-compose.yml config`, then attempted full local compose build/up again; it remains blocked by the workstation environment because `dockerDesktopLinuxEngine` is unavailable.
45. Built a fresh source archive, uploaded it to the VPS, extracted it into `/opt/acorus-wallet`, rebuilt the stack, and found a rollout blocker where `api` failed Prisma auth because the persisted PostgreSQL password no longer matched the current `.env` placeholder password.
46. Repaired the VPS database password drift by aligning the `postgres` role password with the active `.env`, verified direct network access, removed/recreated the stale `acorus-api` container, and completed the rollout.
47. Revalidated VPS health and persistence after rollout: `/health` and `/api/chains` passed on both loopback and public `:8080`, `scripts/check-persistence.sh` passed creation and `CHECK_MODE=verify` after `restart api`, and public HTML fetches succeeded for `/`, `/send`, `/receive`, `/view-only`, and `/practice`.
48. Added `docs/evm_wallet_ux_send_flow_report.md` and updated project memory for the completed EVM Wallet UX + Send Flow wave.
49. Implemented the Real Market Provider + Token Discovery wave: live DexScreener/CoinGecko providers, composite fallback, token discovery endpoint, enriched user-token metadata, provider/risk UI, and updated docs.
50. Ran follow-up alignment fixes so the wave matches the requested contract: canonical market env vars, rate-limit usage, cache-first `/api/market/prices`, discovery null-safe behavior, provider/risk badges, and richer token details warnings.
51. Built a fresh deploy archive, uploaded it to the VPS via Paramiko, rebuilt `api` and `web`, and brought the live stack back up on `:8080`.
52. Verified live VPS responses for `/health`, `/api/market/prices`, `/api/market/chart`, and `/api/market/discover-token`; confirmed CoinGecko live price responses and DexScreener live discovery for USDC.
53. Re-ran `scripts/check-persistence.sh` before and after `docker compose restart api`; persistence verification passed.
54. Corrected the Prisma post-deploy command path and confirmed `npx prisma db push --schema prisma/schema.prisma` from `/app/apps/api` reports the database already in sync.
49. Implemented Real Market Provider + Token Discovery wave: DexScreener + CoinGecko composite provider, `/api/market/discover-token` endpoint, enriched Prisma schema (MarketPriceCache + UserToken), in-memory TTL cache, rate limiter, HTTP timeout wrapper, preview-first `/tokens/add` flow with risk assessment.
50. Deployed Real Market Provider wave to VPS: rebuilt api/web Docker images, ran `prisma db push` (already in sync), restarted services, verified all endpoints live — `/health`, `/api/market/prices`, `/api/market/chart`, `/api/market/discover-token` (DexScreener live data for USDC: liquidity $45M, volume $10M, risk=low).
52. Fixed gaps in Real Market Provider wave: proper cache-first logic, `sourceStatus` values (`cached|live|stale_cache|fallback_mock`), `SimpleWindowRateLimiter` in composite, `discover-token` returns null on failure, canonical env vars, shared type aliases, UI badges for provider/risk/liquidity, token detail market stats, glass UI polish. All 27 tests pass. Commit: bcec215. VPS redeploy blocked by SSH auth change (password auth disabled per hardening); manual redeploy via VPS console required.


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
- `pnpm --filter @acorus/api prisma:generate`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh`
- `docker compose --env-file .env -f infra/docker-compose.yml restart api`
- `git status --short`
- `git --no-pager log --oneline -5`
- `git branch --show-current`
- `git diff --stat`
- `git ls-files`
- `git --no-pager grep -n -i "password"`
- `git --no-pager grep -n -i "DATABASE_URL"`
- `git --no-pager grep -n -i "POSTGRES_PASSWORD"`
- `git --no-pager grep -n -i "mnemonic"`
- `git --no-pager grep -n -i "seed phrase"`
- `git --no-pager grep -n -i "seedPhrase"`
- `git --no-pager grep -n -i "privateKey"`
- `git --no-pager grep -n -i "passcode"`
- `git --no-pager grep -n -i "BEGIN OPENSSH"`
- `git --no-pager grep -n -i "token"`
- `git --no-pager grep -n -i "secret"`
- `git --no-pager log --all --stat -- .env`
- `git --no-pager log --all -S"POSTGRES_PASSWORD" --source --all`
- `git --no-pager log --all -S"DATABASE_URL" --source --all`
- `git --no-pager log --all -S"privateKey" --source --all`
- `git --no-pager log --all -S"mnemonic" --source --all`
- `git --no-pager log --all -S"passcode" --source --all`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `pnpm --filter @acorus/api prisma:generate`
- `bash -n scripts/check-persistence.sh`
- `bash -n scripts/docker/api-entrypoint.sh`
- `bash -n scripts/backup-postgres.sh`
- `bash -n scripts/restore-postgres.sh`
- `git diff --check`
- `docker compose --env-file .env -f infra/docker-compose.yml config`
- `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- `docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis api web nginx`
- `docker compose --env-file .env -f infra/docker-compose.yml ps`
- `docker compose --env-file .env -f infra/docker-compose.yml logs --tail=... api nginx web`
- `curl -fsS http://127.0.0.1:8080/health`
- `curl -fsS http://127.0.0.1:8080/api/chains`
- `curl -fsS http://85.239.59.199:8080/health`
- `git archive --format=tar.gz --output ... HEAD`
- Python `paramiko` upload to `/tmp/real-market-deploy.tar.gz`
- Remote `tar -xzf /tmp/real-market-deploy.tar.gz -C /opt/acorus-wallet`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml exec -T api sh -lc "cd /app/apps/api && npx prisma db push --schema prisma/schema.prisma"`
- `curl -fsS "http://127.0.0.1:8080/api/market/prices?chainId=1&currency=USD&symbols=ETH,USDT"`
- `curl -fsS "http://127.0.0.1:8080/api/market/discover-token?chainId=1&tokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"`
- `curl -fsS "http://85.239.59.199:8080/api/market/prices?chainId=1&currency=USD&symbols=ETH,USDT"`
- `curl -fsS "http://85.239.59.199:8080/api/market/discover-token?chainId=1&tokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `docker compose --env-file .env -f infra/docker-compose.yml config`
- `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- `docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis api web nginx`
- `tar.exe -czf ... acorus-wallet`
- Python `paramiko` upload to `/root/acorus-wallet-deploy.tar.gz`
- Remote `docker compose ... rm -sf api && docker compose ... up -d api nginx`
- Remote `docker exec -u postgres acorus-postgres psql -d acorus_wallet -c "ALTER USER postgres WITH PASSWORD '...'"` to realign the persisted role password with `.env`
- Remote `BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh`
- Remote `CHECK_MODE=verify BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh`
- Public route fetches for `/`, `/send`, `/receive`, `/view-only`, `/practice`
- `curl -fsS http://85.239.59.199:8080/api/chains`
- `CHECK_MODE=verify BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh`
- `bash scripts/backup-postgres.sh`
- `docker compose --env-file .env -f infra/docker-compose.yml ps`
- `curl -fsS http://127.0.0.1:8080/health`
- `curl -fsS http://127.0.0.1:8080/api/chains`
- `curl -fsS http://85.239.59.199:8080/health`

## Current follow-up

- Keep Prisma/Postgres as the default VPS runtime, but rotate the compromised root password before treating the server as trusted again
- Add SSH key auth, disable password login after validation, and move to domain + HTTPS before any real-user or mainnet exposure
- After domain setup, set `CORS_ORIGIN` explicitly and re-run the deployment/security audit
- Current product follow-up: the EVM Wallet UX + Send Flow wave is implemented and deployed; next product work can focus on browser-level E2E coverage or later chain families without relaxing the current non-custodial boundary
- Current product follow-up: the Real Market Provider + Token Discovery wave is now implemented, aligned, and deployed; the next sensible step is a real historical chart source plus hide/unhide token management on the wallet screens

37. Implemented EVM Token Details + Market Data + Portfolio UX wave (2026-05-15):
    - Phase 1: packages/shared/src/market.ts with FiatCurrency, TokenPrice, TokenChart, PortfolioSummary types
    - Phase 2: Prisma schema — UserToken, MarketPriceCache, MarketChartCache models
    - Phase 3: AppStore extended with 8 new methods (listUserTokens, createUserToken, updateUserTokenVisibility, deleteUserToken, getMarketPrices, upsertMarketPrice, getMarketChart, upsertMarketChart)
    - Phase 4-5: MemoryStore + PrismaStore implementations; discovered Prisma null compound key bug, fixed with "" sentinel
    - Phase 6: MockMarketDataProvider (deterministic pseudo-prices + sin-wave charts)
    - Phase 7: API routes /api/user-tokens CRUD + /api/market/prices + /api/market/chart
    - Phase 8: wallet-core evm/portfolio.ts, evm/token-metadata.ts
    - Phase 9: Frontend api.ts extended with 6 new typed functions
    - Phase 10: apps/web/lib/portfolio.ts — loadEvmPortfolioSummary (live + practice modes)
    - Phase 11: PortfolioSummaryCard, AssetList, TokenChart components
    - Phase 12: wallet/page.tsx rebuilt with portfolio summary + asset list + Add token link
    - Phase 13: /tokens/[chainId]/[tokenAddress]/page.tsx — token detail + sparkline chart
    - Phase 14: /tokens/add/page.tsx — add custom ERC-20 by contract address
    - VPS: rebuilt API container, applied prisma db push (schema already in sync), confirmed all endpoints live
