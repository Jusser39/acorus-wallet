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

- Solana skeleton runtime and unified multichain adapter foundation are live; real Solana send, Tron/BTC balances/send, real swap execution, and NFT flows are still not implemented
- Universal swap quote shell is now live as preview-only; dashboard action grid plus Explore/Security/dApps/Extension/Quests shells are live; `apps/extension` now includes a Manifest V3 extension shell, preview dApp session/permission queue surfaces, and a live preview-backed connect/accounts/chainId bridge; WalletConnect / signing approval / real swap execution / NFT module are still not implemented
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

## Unified Multichain Asset Engine + Adapter Foundation Wave (2026-05-15)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/unified_multichain_asset_engine_plan.md`
- Report: `docs/unified_multichain_asset_engine_report.md`
- New shared architecture:
  - `packages/shared/src/multichain.ts` adds `ChainRef`, `AssetRef`, `AssetBalance`, `ReceiveInfo`, universal transaction/send types, and swap quote types
  - `packages/shared/src/chains.ts` now exposes `UNIVERSAL_CHAINS`, plus skeleton Tron and Bitcoin/UTXO chain configs alongside EVM and Solana
  - `/api/chains` now returns the universal chain list while preserving the existing response shape
- New wallet-core architecture:
  - `ChainAdapter` interface and `ChainAdapterRegistry` added
  - EVM logic now has an adapter wrapper over the existing send/balance/explorer helpers
  - Solana foundation is exposed through a dedicated adapter wrapper
  - Tron and Bitcoin/UTXO skeleton adapters were added with validate/receive/explorer support and explicit `not_implemented` balance paths
  - swap quote interfaces were added without implementing any swap execution
- New web foundation:
  - universal receive helper added
  - universal portfolio loader added for adapter-backed chains
  - dashboard now branches safely by chain family without touching the existing EVM send path
  - view-only validation now goes through the adapter registry for supported families
  - token/asset helpers no longer lowercase Solana token ids
- New market/runtime behavior:
  - CoinGecko symbol mapping now includes `SOL`, `BTC`, and `TRX`
  - mock market provider base prices now include `SOL=150`, `BTC=65000`, `TRX=0.12`
  - root workspace `test/build` scripts now run sequentially to avoid a `tsup --clean` race in `wallet-core`
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - `/api/chains` returns Solana plus skeleton `tron-mainnet` and `bitcoin-mainnet`
  - `/api/market/prices?chainId=101&currency=USD&symbols=SOL` returns price data
  - `/api/market/chart?chainId=101&currency=USD&symbol=SOL&range=7D` returns chart data
  - persistence verification passes after `docker compose restart api`
- Local Docker compose regression remains workstation-blocked because `dockerDesktopLinuxEngine` is unavailable, so deployment verification stayed VPS-first
- Non-custodial boundary unchanged: backend still never receives mnemonic/privateKey/passcode, Solana send remains disabled, and Tron/BTC adapters do not pretend to support real balances or sends

## Universal Multichain Wallet UI Wave (2026-05-15)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_multichain_wallet_ui_plan.md`
- Report: `docs/universal_multichain_wallet_ui_report.md`
- New web/UI architecture:
  - `apps/web/lib/universal-assets.ts` adds universal asset/portfolio view models and helper labels
  - `apps/web/lib/universal-chains.ts` centralizes family defaults, UI-visible chains, and chain-family RPC resolution
  - `apps/web/lib/universal-explorer.ts`, `apps/web/lib/receive.ts`, and `apps/web/lib/send-policy.ts` provide family-aware explorer, receive, and send policy helpers
  - `apps/web/components/universal-badges.tsx` and `apps/web/components/asset-list.tsx` now surface chain family, asset type, source, and skeleton states
- Updated product screens:
  - `/wallet` branches by chain family while preserving the working EVM dashboard/send entry
  - `/receive` now renders adapter-based receive info with family-aware warnings and explorer links
  - `/send` keeps the existing EVM flow and shows explicit disabled states for non-EVM families
  - `/history` now shows honest non-EVM indexing notices
  - `/view-only` validates EVM, Solana, Tron, and Bitcoin addresses through the adapter registry
  - `/tokens/[chainId]/[tokenAddress]` now handles `family`, `native`, and skeleton routes without crashing
- Validation completed for this wave:
  - `pnpm --filter @acorus/wallet-core test`
  - `pnpm --filter @acorus/api test`
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/api build`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - `/api/chains` returns EVM, Solana, `tron-mainnet`, and `bitcoin-mainnet`
  - `/api/market/prices?chainId=101&currency=USD&symbols=SOL` returns price data
  - `/api/market/chart?chainId=101&currency=USD&symbol=SOL&range=7D` returns chart data
  - persistence verification passes after `docker compose restart api`
  - public routes `/wallet`, `/receive`, `/send`, `/history`, `/tokens/manage`, and `/view-only` respond
- Non-custodial boundary unchanged: backend still never receives mnemonic/privateKey/passcode, EVM send remains intact, Solana send stays disabled, and Tron/BTC remain explicit skeleton flows
- Implementation commit: `066d3af`

## Universal Send Draft Engine Wave (2026-05-16)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_send_draft_engine_plan.md`
- Report: `docs/universal_send_draft_engine_report.md`
- New shared/core capabilities:
  - `packages/shared/src/multichain.ts` now includes `SendSupportStatus`, `SendValidationIssue`, `FeeEstimate`, and the expanded `SendDraftInput` / `SendDraft` model
  - `packages/wallet-core/src/send/amount.ts` adds decimal parsing, raw formatting, normalization, and raw amount comparison helpers
  - `packages/wallet-core/src/send/validation.ts` adds reusable issue creation, warning/error splitting, and balance validation helpers
  - `packages/wallet-core/src/send/draft-engine.ts` adds `SendDraftEngine`, which normalizes amount input, validates addresses, checks balance availability, and delegates family-specific draft shaping to adapters
- Adapter behavior added:
  - EVM adapters now expose `createSendDraft()` with supported native/ERC-20 draft output and draft-level gas placeholders
  - Solana adapter now returns a `coming_soon` validation/preview draft without broadcast support
  - Tron and Bitcoin adapters now return explicit `skeleton` drafts instead of pretending send is available
- New frontend capabilities:
  - `apps/web/lib/send-draft.ts` exposes `createUniversalSendDraft()` for family-aware draft creation
  - `apps/web/components/send-draft-preview.tsx` provides a reusable preview card for the future Universal Send UI wave
  - `apps/web/lib/universal-chains.ts` now fails soft when an EVM RPC URL is absent, so draft creation can still work in test/fallback contexts
- Existing UX preserved:
  - `/send` still uses the old working EVM send flow and was not rewritten in this wave
  - Solana/Tron/BTC real sending remains disabled
  - backend request boundaries for mnemonic/privateKey/passcode remain unchanged
- Validation completed for this wave:
  - `pnpm --filter @acorus/shared build`
  - `pnpm --filter @acorus/wallet-core test`
  - `pnpm --filter @acorus/api test`
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/api build`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- Local Docker note:
  - local Docker regression remains blocked because `dockerDesktopLinuxEngine` is unavailable on this workstation
- VPS verified:
  - `docker compose ... ps` shows healthy `api`, `postgres`, `redis`, and running `web`/`nginx`
  - `/health` passes on loopback and public `:8080`
  - `/api/chains` still returns EVM, Solana, Tron skeleton, and Bitcoin skeleton items
  - persistence verification passes before and after `docker compose restart api`
  - public routes `/`, `/wallet`, `/send`, and `/receive` return HTTP 200
- Next product step: Universal Send UI

## Universal Send UI Wave (Wave 4) (2026-05-15)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_send_ui_plan.md`
- Report: `docs/universal_send_ui_report.md`
- New web/UI capabilities:
  - `apps/web/lib/send-ui.ts` adds `SendStep`, `SendAssetOption`, `SendNetworkOption`, `SendComposerState`, `createSendAssetOptionId`, `getSendStatusLabel`, `canNetworkBroadcast`
  - `apps/web/lib/send-networks.ts` adds `buildSendNetworkOptions()` and `findSendNetworkOption()` — maps EVM chains to `supported`, Solana to `coming_soon`, Tron/UTXO to `skeleton`
  - `apps/web/lib/send-assets.ts` adds `buildSendAssetOptions()` and `buildFallbackNativeAsset()` — handles both `UniversalPortfolioView` and `PortfolioSummaryView`, falls back to native placeholder when portfolio is null
  - `apps/web/components/send-composer.tsx` — single wizard: Network → Asset → Recipient → Amount → Draft → Preview; uses `createUniversalSendDraft()` and `SendDraftPreview`; shows amber warning for non-broadcast adapters; provides EVM bridge anchor for legacy EVM form
- Updated product screens:
  - `/send` (non-EVM profiles): old dead-end block replaced with `<SendComposer>` — honest draft validation visible, broadcast gate shows "coming soon/skeleton"
  - `/send` (EVM profiles): `<SendComposer>` added as draft validation header above the existing EVM send form; `#evm-send-form` anchor allows bridge from composer to real send
  - `/wallet`: send CTA enabled for non-EVM non-view_only profiles as "Send draft" link to `/send`; Solana/skeleton info banners updated to reference composer
- Safety guarantee maintained:
  - `canNetworkBroadcast()` prevents any send attempt for coming_soon/skeleton adapters
  - Draft preview is not broadcast — no funds move from the universal composer
  - Non-custodial boundary unchanged: backend never receives mnemonic/privateKey/passcode
  - Old EVM send form NOT deleted — remains intact under `#evm-send-form` anchor
- 19 new unit tests (send-ui, send-networks, send-assets)
- All 49 web tests pass; build clean (18 routes)
- VPS verified:
  - `docker compose ps` shows healthy `api`, running `web`, `nginx`, `postgres`, `redis`
  - `/health` passes on loopback and public `:8080`
  - `/api/chains` still returns EVM, Solana, Tron skeleton, Bitcoin skeleton
  - persistence verification passes after `docker compose restart api`
  - public routes `/`, `/wallet`, `/send`, `/receive` return HTTP 200
- Implementation commit: `feat: add universal send ui (Wave 4)` (`5eb4a1f`)
- Next product step: EVM Send through universal layer (Wave 5)

## Universal Send Execution Layer Wave (Wave 5) (2026-05-16)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_send_execution_layer_plan.md`
- Report: `docs/universal_send_execution_layer_report.md`
- New shared/core capabilities:
  - `SendExecutionStatus`, `SendExecutionRequest`, `SendExecutionResult` types added to `packages/shared/src/multichain.ts`
  - `BroadcastSendInput` type and optional `broadcastSend?` method added to `ChainAdapter` interface in `packages/wallet-core/src/adapters/types.ts`
  - `packages/wallet-core/src/send/execution-engine.ts` (NEW) — `SendExecutionEngine` class with full pre-flight guard (unsupported/rejected/failed/submitted)
  - EVM adapter `broadcastSend()` implementation: real native coin and ERC-20 sends via viem helpers
  - Non-EVM adapters (Solana/Tron/UTXO) all return explicit `unsupported` results from `broadcastSend()`
- New frontend capabilities:
  - `apps/web/lib/send-execution.ts` (NEW) — `executeUniversalSend()` client-side service, never imported server-side
  - `SendComposer` now accepts `mnemonic?`, `privateKey?`, `onExecutionResult?` props
  - Preview panel shows execute button when `draft.canBroadcast && mnemonic && local profile`
  - Execution result displays: status, txHash (monospace), explorer link, error message
  - Non-EVM: amber "broadcast disabled" notice; broadcast button never renders
  - `/send` page passes `mnemonic` to both SendComposer instances; EVM instance persists tx on success
- Safety invariants maintained:
  - Backend never receives mnemonic/privateKey/passcode
  - Non-custodial boundary unchanged: all signing is client-side only
  - Legacy EVM send form preserved under `#evm-send-form` anchor
  - `BroadcastSendInput.signerSecretRef` is a marker string only, not key material
- Validation completed for this wave:
  - `pnpm --filter @acorus/wallet-core test` — 24/24 pass (2 new `SendExecutionEngine` tests)
  - `pnpm --filter @acorus/web test` — 49/49 pass
  - `pnpm build` — clean, 18 routes, TypeScript strict
- VPS verified:
  - `docker compose build api web` succeeded
  - `docker compose up -d api web nginx` — containers recreated and healthy
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - `/api/chains` returns 9 chains
  - `/send` returns HTTP 200
  - persistence verification passes after `docker compose restart api`
- Known limitation: `onExecutionResult` persists tx with placeholder `to/amount/assetType` because full draft lives in SendComposer state. To be improved in a future wave.
- Implementation commit: `6d938ab`

## Universal Adapter Expansion Alignment (2026-05-16)

- Status: **roadmap aligned**
- New document: `docs/adapter_expansion_roadmap.md`
- Updated docs: `README.md`, `docs/architecture.md`, `docs/roadmap.md`
- Product direction now explicitly fixed as **universal multichain wallet + swap + dapp shell**
- EVM remains the strongest live adapter, but no longer defines product identity or roadmap naming
- Solana, Tron, Bitcoin/UTXO, TON, and future families are treated as adapters under one shared `Network → Asset → Action` UX
- The next roadmap layers are now framed around:
  - adapter contract completion
  - universal swap engine
  - universal dapp session/signing shell
- Safety boundary unchanged: backend still never receives mnemonic/privateKey/passcode; send/swap/dapp approvals remain client-side only
- This alignment changed documentation and planning only; no runtime behavior changed in this step

## Universal Swap + Dapp Planning Alignment (2026-05-16)

- Status: **planning docs added**
- New documents:
  - `docs/universal_swap_shell_plan.md`
  - `docs/universal_dapp_shell_plan.md`
- Universal swap is now fixed as one quote/review/approval/execute shell, with EVM as the first live reference adapter and other families joining through the same capability contract
- Universal dapp support is now fixed as one session/permission/signing shell, not as separate WalletConnect-style products per family
- Both plans keep the same non-custodial boundary as send execution: backend never receives mnemonic/privateKey/passcode and all approvals stay client-side
- This step still changed documentation/planning only; no runtime behavior changed

## Universal Swap Quote Engine + Swap Shell MVP (Wave 6) (2026-05-16)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_swap_quote_engine_plan.md`
- Report: `docs/universal_swap_quote_engine_report.md`
- New shared/core capabilities:
  - `packages/shared/src/multichain.ts` now exposes canonical universal swap quote types: `SwapQuoteStatus`, `SwapProviderId`, `SwapSlippageMode`, `SwapQuoteRequest`, `SwapRouteStep`, `SwapQuote`
  - `packages/wallet-core/src/swap/provider.ts` adds `SwapQuoteProvider` plus capability metadata and `isSameChainSwap()`
  - `packages/wallet-core/src/swap/mock-provider.ts` adds preview-only same-chain and cross-chain mock routing with warnings, minimum received, and mock gas asset metadata
  - `packages/wallet-core/src/swap/quote-engine.ts` adds `SwapQuoteEngine` plus `createDefaultSwapQuoteEngine()`
- New backend/frontend capabilities:
  - `POST /api/swap/quote` added in API and wired to the quote engine
  - sensitive swap payload fields such as `mnemonic`, `seed`, `privateKey`, and `passcode` are rejected with `sensitive_fields_not_allowed`
  - `apps/web/lib/api.ts` now exposes `getSwapQuote()`
  - `/swap` route, `SwapComposer`, `SwapRoutePreview`, `swap-ui.ts`, and `swap-assets.ts` add the universal shell flow `Network → Asset → Amount → Quote → Route Preview`
  - wallet navigation and wallet quick actions now link to `/swap`
- Safety boundary maintained:
  - quote preview only; execution remains disabled / coming soon
  - no approvals, signing, allowance handling, or broadcast
  - backend still never receives mnemonic/privateKey/passcode
- Validation completed for this wave:
  - `pnpm --filter @acorus/shared build`
  - `pnpm --filter @acorus/wallet-core test`
  - `pnpm --filter @acorus/api test`
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/api build`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - `/api/chains` still returns the universal chain list
  - `/swap` returns HTTP 200 on loopback and public `:8080`
  - `POST /api/swap/quote` returns mock same-chain/cross-chain preview quotes
  - sensitive-field rejection returns HTTP 400 with `sensitive_fields_not_allowed`
  - persistence verification passes before and after `docker compose restart api`
- Local Docker note:
  - local Docker regression remains workstation-blocked because `dockerDesktopLinuxEngine` is unavailable on this machine

## Competitor Benchmark + Product UX Upgrade + Extension Roadmap (2026-05-16)

- Status: **implemented, validated locally, and deployed to VPS**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- New documents:
  - `docs/wallet_competitor_benchmark.md`
  - `docs/chrome_extension_roadmap.md`
  - `docs/product_ux_upgrade_plan.md`
  - `docs/wallet_product_benchmark_ux_upgrade_report.md`
- Benchmark direction captured:
  - MetaMask → extension-ready architecture, permissions thinking, transaction review, network/account controls
  - Trust Wallet → beginner-friendly multichain action cards, security center language, asset-hub positioning
  - Uniswap Wallet → premium swap-first dashboard language, clean action cards, route-preview-friendly product shell
  - PancakeSwap → Explore / Earn / Quests / Launch style ecosystem framing without implying live execution
- New web/product capabilities:
  - `apps/web/lib/product-features.ts` adds the product feature registry for live / preview / planned surfaces
  - `ProductFeatureCard` and `WalletActionGrid` upgrade the wallet dashboard with a universal action grid
  - new shell routes: `/explore`, `/security`, `/dapps`, `/extension`, `/quests`
  - wallet navigation now surfaces the product shell more cleanly around Wallet / Send / Receive / Swap / Explore / Security / dApps / Settings
  - future features are explicitly marked `Preview` or `Planned`
- Extension readiness remains docs-first:
  - no extension provider injection
  - no WalletConnect
  - no dApp connection runtime
  - no new signing or broadcast behavior
- Validation completed for this wave:
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - public routes `/wallet`, `/explore`, `/security`, `/dapps`, `/extension`, `/quests`, `/swap` return HTTP 200
  - persistence verification passes before and after `docker compose restart api`
- Local Docker note:
  - local Docker engine remains workstation-blocked because `dockerDesktopLinuxEngine` is unavailable on this machine, so deployment verification stayed VPS-first

## Chrome Extension Architecture Skeleton (2026-05-16)

- Status: **implemented and validated locally**
- Deployment: repository-only change; no VPS rollout required
- New documents:
  - `docs/chrome_extension_architecture_skeleton_plan.md`
  - `docs/chrome_extension_architecture_skeleton_report.md`
- New package:
  - `apps/extension`
- New extension architecture pieces:
  - Manifest V3 build output with background service worker, content script, inpage provider stub, popup shell, and options shell
  - shared message bus and permission model types in `apps/extension/src/shared/protocol.ts`
  - storage-backed connected-sites placeholder in `apps/extension/src/background/permission-store.ts`
- Safety boundary maintained:
  - no live dApp connectivity
  - no WalletConnect
  - no account exposure
  - no signing or broadcast
  - no mnemonic/privateKey/passcode handling
- Validation completed for this wave:
  - `pnpm --filter @acorus/extension test`
  - `pnpm --filter @acorus/extension build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`

## Universal dApp Session / Permission Shell (2026-05-16)

- Status: **implemented, validated locally, and deployed to VPS for the web shell**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_dapp_session_permission_shell_plan.md`
- Report: `docs/universal_dapp_session_permission_shell_report.md`
- New shared/core capabilities:
  - `packages/shared/src/dapp.ts` adds canonical dApp session, permission, request, approval, and snapshot types
  - shared reducer helpers now support approve/reject/revoke preview flows
  - adapter capability metadata now includes `dapp`
- New web/extension capabilities:
  - `/dapps` now renders an interactive preview session shell instead of a static placeholder
  - `apps/extension` background store now tracks proposals, sessions, pending requests, and approval history
  - popup and options shells now expose approve/reject/revoke actions over the shared preview contract
- Safety boundary maintained:
  - no live site connectivity
  - no WalletConnect
  - no account exposure to real sites
  - no signing or broadcast
  - no mnemonic/privateKey/passcode handling outside the client vault boundary
- Validation completed for this wave:
  - `pnpm --filter @acorus/shared build`
  - `pnpm --filter @acorus/extension test`
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/extension build`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - public route `/dapps` returns HTTP 200 after rollout
  - persistence verification still passes after `docker compose restart api`

## Universal dApp Live Bridge (2026-05-16)

- Status: **implemented, validated locally, and deployed to VPS for the web shell**
- Deployment: `http://85.239.59.199:8080`
- Backend store remains `prisma`
- Planning document: `docs/universal_dapp_live_bridge_plan.md`
- Report: `docs/universal_dapp_live_bridge_report.md`
- New shared/core capabilities:
  - `packages/shared/src/dapp.ts` now models live origin bridge state, provider exposure mode, active chain tracking, and connect proposal helpers
  - shared dApp reducers now support active-chain switching and origin bridge snapshots
- New extension/web capabilities:
  - `apps/extension` now exposes a live preview-backed bridge for `acorus_requestAccounts`, `acorus_accounts`, `acorus_chainId`, and `acorus_switchChain`
  - content and inpage surfaces now sync origin bridge state and emit provider state change events
  - `/dapps` and `/extension` now describe the bridge as live for connect/network metadata while keeping sign/send blocked
- Safety boundary maintained:
  - no mnemonic/privateKey/passcode exposure
  - no signing output
  - no transaction broadcast
  - no WalletConnect
  - no backend custody changes
- Validation completed for this wave:
  - `pnpm --filter @acorus/shared test`
  - `pnpm --filter @acorus/shared build`
  - `pnpm --filter @acorus/extension test`
  - `pnpm --filter @acorus/web test`
  - `pnpm --filter @acorus/extension build`
  - `pnpm --filter @acorus/web build`
  - `pnpm test`
  - `pnpm build`
  - `git diff --check`
- VPS verified:
  - `/health` returns `store: "prisma"` on loopback and public `:8080`
  - public routes `/dapps` and `/extension` return HTTP 200 after rollout
  - persistence verification still passes after `docker compose restart api`

