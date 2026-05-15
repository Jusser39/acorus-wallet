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
- Token Management + Real Charts wave deployed (2026-05-15)
  - New routes: `/api/user-tokens/hide`, `/api/user-tokens/unhide`
  - `/api/market/chart` now uses cache-first semantics with `cached | live | stale_cache | fallback_mock`
  - CoinGecko historical charts are now live for supported major symbols
  - Mock chart fallback remains in place for unsupported/custom tokens
  - Wallet dashboard can hide tokens directly
  - New `/tokens/manage` page supports search/filter, hide/unhide, and delete custom token
  - Curated token visibility overrides now work through user token records
  - Token detail page now shows real chart ranges, provider/source badges, and richer market context
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

- Solana skeleton runtime is live; real Solana send/swap/NFT and Tron runtime are still not implemented
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

## Real Market Provider Wave – Fix/Alignment (2026-05-15)

- Commits:
  - `bcec215` — align Real Market Provider wave with spec
  - `268a2d5` — update project/action memory for fix wave
- Status: **All 27 tests pass. pnpm build passes. VPS deployment succeeded.**
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
- Canonical env vars:
  - `MARKET_PROVIDER_MODE` with `real | real_with_mock_fallback | mock`
  - `MARKET_CACHE_TTL_SECONDS`
  - `MARKET_STALE_CACHE_TTL_SECONDS`
  - `DEXSCREENER_BASE_URL`
  - `COINGECKO_BASE_URL`
  - `MARKET_HTTP_TIMEOUT_MS`
  - `MARKET_RATE_LIMIT_PER_MINUTE`
- New endpoint: `GET /api/market/discover-token?chainId=&tokenAddress=`
  - Returns live data from DexScreener/CoinGecko with risk assessment
  - Validated: address must be 0x + 40 hex chars, rejects mnemonic-like inputs
- Prisma schema enriched: `MarketPriceCache` (+sourceStatus, liquidityUsd, pairUrl, riskLevel, riskFlagsJson), `UserToken` (+sourceStatus, liquidityUsd, volume24hUsd, marketCapUsd, fdvUsd, pairUrl, riskLevel, riskFlagsJson, lastMarketSyncAt)
- Frontend: preview-first token add flow with risk warnings, provider/risk badges in asset list
- Infrastructure: `http.ts` (timeout wrapper), `rate-limit.ts` (30 RPM token bucket), `cache.ts` (in-memory TTL)
- Non-custodial boundary unchanged: discover-token accepts only chainId + tokenAddress
- VPS verified:
  - `/health` returns `store: "prisma"`
  - `/api/market/prices?chainId=1&currency=USD&symbols=ETH,USDT` returns live CoinGecko prices on cache miss, then cached responses with `sourceStatus`
  - `/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=7D` works and remains mock chart fallback in MVP
  - `/api/market/discover-token` returns live DexScreener discovery for USDC with liquidity/volume/risk data
  - `scripts/check-persistence.sh` passes before and after `restart api`
  - `prisma db push` confirmed from `/app/apps/api` inside the API container
- Public URL remains `http://85.239.59.199:8080`

## Token Management + Real Charts Wave (2026-05-15)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/token_management_real_charts_plan.md`
- Report: `docs/token_management_real_charts_report.md`
- New backend capabilities:
  - `hideToken` / `unhideToken` in MemoryStore and PrismaStore
  - custom-token-only delete guard
  - chart cache-first API behavior with source statuses
  - CoinGecko historical chart provider for supported mapped symbols
- New frontend capabilities:
  - dashboard token hide action
  - `/tokens/manage` with search/filter and visibility controls
  - curated token visibility overrides
  - token details range selector and chart/provider badges
- VPS verified:
  - `/health` returns `store: "prisma"`
  - `/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=1D` returns `provider: "coingecko"`
  - `/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=1M` returns `provider: "coingecko"`
  - persistence verification passed before and after `docker compose restart api`
- Rollout note:
  - immediate verify after restart briefly returned `502` during warm-up
  - retry after a short delay passed cleanly
- Non-custodial boundary unchanged

## Solana Wallet Skeleton Wave (2026-05-15)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/solana_wallet_skeleton_plan.md`
- New shared/core capabilities:
  - Solana chain config added alongside the existing EVM registry
  - same-mnemonic Solana derivation added in `wallet-core`
  - Solana native balance, SPL balance, and portfolio helpers added
  - chain-aware address normalization introduced so Solana base58 addresses and mint ids are not lowercased
- New web/product capabilities:
  - create/import flows now support an EVM vault plus sibling Solana profile
  - Solana receive, QR/copy, view-only, practice mode, portfolio summary, and asset list are live
  - wallet navigation now supports profile switching across chain families
  - Solana history is read-only/skeleton and Solana send remains intentionally disabled in this wave
- New API/store capabilities:
  - `/api/chains` now returns Solana
  - transaction explorer URLs and token normalization are chain-family aware
  - Prisma/Memory store logic preserves case-sensitive Solana token addresses
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - `/api/chains` returns Solana `chainId: 101`
  - `/api/market/prices?chainId=101&currency=USD&symbols=SOL` returns Solana-compatible price data
  - `/api/market/chart?chainId=101&currency=USD&symbol=SOL&range=7D` returns Solana-compatible chart data
- Non-custodial boundary unchanged: mnemonic/private key/passcode never leave the client, and Solana signing stays out of the backend in this wave
