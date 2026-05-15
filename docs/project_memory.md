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
- EVM Token Details + Market Data + Portfolio UX wave deployed (2026-05-15)
  - New models: UserToken, MarketPriceCache, MarketChartCache
  - New routes: /api/user-tokens CRUD, /api/market/prices, /api/market/chart
  - MockMarketDataProvider: pseudo-prices seeded by symbol, sin-wave chart generation
  - Frontend: PortfolioSummaryCard, AssetList, TokenChart, /tokens/add, /tokens/[chainId]/[address]
  - Prisma null sentinel fix: use "" for tokenAddress in compound unique key where clause
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

## Real Market Provider Wave – Fix/Alignment (2026-05-XX)

- Commit: `bcec215`
- Status: **All 27 tests pass. pnpm build passes. VPS deployment pending (SSH auth issue).**
- Key fixes vs. prior wave:
  - `/api/market/prices` now implements proper 5-step cache-first logic with `sourceStatus` on every response
  - `discover-token` now returns `{ ok: true, discovery: null }` on failure (no longer `ok: false`)
  - `MARKET_PROVIDER_MODE` canonical values: `real|real_with_mock_fallback|mock`; legacy `live/auto` accepted
  - Canonical env vars added: `MARKET_CACHE_TTL_SECONDS`, `MARKET_STALE_CACHE_TTL_SECONDS`, `MARKET_RATE_LIMIT_PER_MINUTE`
  - `SimpleWindowRateLimiter` used inside `CompositeMarketDataProvider`
  - Mock fallback prices tagged `sourceStatus: "fallback_mock"`
  - `packages/shared`: added `RealMarketProviderId`, `MarketDataSourceStatus`, `TokenRiskLevel`, `TokenRiskFlag`, `DexPairInfo`, `MarketProviderHealth`
  - `PortfolioAssetView` now carries `provider`, `sourceStatus`, `liquidityUsd`, `pairUrl`, `riskLevel`, `riskFlagsJson`
  - `asset-list.tsx`: provider badge + risk badge + liquidity + glass UI
  - Token detail page: full market stats grid, risk warning box, pair link, source badge
  - `add/page.tsx`: removed `console.warn`
  - 4 new API tests cover all new behaviors

- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/real_market_provider_token_discovery_plan.md`
- Report: `docs/real_market_provider_token_discovery_report.md`
- New market provider architecture: DexScreener (primary) → CoinGecko (fallback) → Mock (final fallback)
- New env vars: `MARKET_PROVIDER_MODE`, `DEXSCREENER_BASE_URL`, `COINGECKO_BASE_URL`, `COINGECKO_API_KEY`, `MARKET_PRICE_TTL_SEC`, `MARKET_CHART_TTL_SEC`, `MARKET_DISCOVERY_TTL_SEC`, `MARKET_HTTP_TIMEOUT_MS`, `MARKET_RATE_LIMIT_RPM`
- New endpoint: `GET /api/market/discover-token?chainId=&tokenAddress=`
  - Returns live data from DexScreener/CoinGecko with risk assessment
  - Validated: address must be 0x + 40 hex chars, rejects mnemonic-like inputs
- Prisma schema enriched: `MarketPriceCache` (+sourceStatus, liquidityUsd, pairUrl, riskLevel, riskFlagsJson), `UserToken` (+sourceStatus, liquidityUsd, volume24hUsd, marketCapUsd, fdvUsd, pairUrl, riskLevel, riskFlagsJson, lastMarketSyncAt)
- Frontend: preview-first token add flow with risk warnings, provider/risk badges in asset list
- Infrastructure: `http.ts` (timeout wrapper), `rate-limit.ts` (30 RPM token bucket), `cache.ts` (in-memory TTL)
- Non-custodial boundary unchanged: discover-token accepts only chainId + tokenAddress
- VPS verified: `/health` (prisma), `/api/market/prices` (mock fallback), `/api/market/chart` (mock fallback), `/api/market/discover-token` (live DexScreener for USDC returning real liquidity/volume data)
- Commit hash: 194eebd
