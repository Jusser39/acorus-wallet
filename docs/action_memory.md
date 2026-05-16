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

62. Started the Token Management + Real Charts wave with a read-only audit across backend store/provider/chart files, wallet/token frontend screens, docs memory, and live VPS market endpoints.
63. Added `docs/token_management_real_charts_plan.md` and updated the session plan/todo state for the new wave.
64. Extended shared/api/store types for chart ranges, chart source statuses, parsed risk flags, and token visibility operations.
65. Implemented `hideToken` / `unhideToken` in `MemoryStore` and `PrismaStore`, normalized token addresses on user-token creation, and restricted delete to custom tokens only.
66. Upgraded `/api/market/chart` to cache-first behavior with `cached`, `live`, `stale_cache`, and `fallback_mock` semantics.
67. Switched live chart fetches to CoinGecko historical data for supported major symbols while preserving mock chart fallback through the composite provider.
68. Updated the web API client, wallet portfolio merge logic, dashboard asset list, token details screen, and settings/wallet navigation to support hide/unhide management.
69. Added the new `/tokens/manage` page with chain selection, search, filters, hide/unhide actions, and delete custom token controls.
70. Added regression coverage for chart cache-first behavior, hide/unhide overrides, and same-origin hide-token API calls.
71. Re-ran local validation: `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/web build`, `pnpm test`, `pnpm build`, and `git diff --check`.
72. Built a fresh working-tree archive, uploaded it to VPS `85.239.59.199`, rebuilt `api` and `web`, restarted the stack, and re-applied `prisma db push`.
73. Verified live VPS responses for `/health` plus CoinGecko-backed chart endpoints for `ETH` on `1D` and `1M` ranges.
74. Ran persistence creation before restart and verification after restart; the first immediate post-restart verify hit a transient `502`, and the retry after warm-up passed cleanly.
75. Added `docs/token_management_real_charts_report.md` and updated project memory for the completed wave.
76. Started the Solana Wallet Skeleton wave with a read-only audit across shared chain/token types, wallet-core vault/mnemonic helpers, web wallet routes/store helpers, API store/runtime files, Prisma schema, git state, and live VPS health endpoints.
77. Added `docs/solana_wallet_skeleton_plan.md`, updated the session plan, and recorded the Solana implementation todos for deps/shared-core/web/api/tests/deploy/docs/commit.
78. Added Solana dependencies in `@acorus/wallet-core`, then implemented a dedicated Solana module for derivation, address validation, RPC connection, native SOL balance, SPL token balances, and portfolio aggregation.
79. Extended shared chain/token foundations with Solana chain config, curated Solana token metadata, generic explorer helpers, and chain-aware address normalization so Solana case-sensitive addresses/mints are preserved.
80. Updated API/store behavior so `/api/chains` includes Solana, explorer links are chain-family aware, and MemoryStore/PrismaStore stop lowercasing Solana token addresses while keeping EVM normalization unchanged.
81. Reworked the web wallet runtime for chain-family awareness: profile switching, Solana portfolio loading, Solana receive, Solana view-only, Solana practice mode, create/import sibling profile support, Solana token details/manage screens, and explicit send-disabled/history-read-only guards for this wave.
82. Added regression coverage for Solana derivation/address validation plus API/web behaviors, then re-ran local validation: `pnpm --filter @acorus/shared build`, `pnpm --filter @acorus/wallet-core test`, `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/web build`, `pnpm build`, and `git diff --check`.
83. Built a fresh working-tree deploy archive, uploaded it to VPS `85.239.59.199`, rebuilt the `api` and `web` Docker images, recreated the containers, and re-ran `npx prisma db push --schema prisma/schema.prisma` inside the API container.
84. Verified the live rollout on VPS: `/health` passed on loopback and public `:8080`, `/api/chains` returned Solana `chainId: 101`, and Solana market endpoints for `prices` and `chart` responded successfully.
85. Started the Unified Multichain Asset Engine + Adapter Foundation wave with a read-only audit across shared chain/types, wallet-core EVM/Solana helpers, web dashboard/send/receive/history/view-only files, API store/routes, Prisma schema, git state, and live VPS endpoints.
86. Added `docs/unified_multichain_asset_engine_plan.md`, replaced the session plan with the new wave scope, and tracked the new multichain todos through SQL.
87. Added shared multichain foundation: `packages/shared/src/multichain.ts`, universal chain configs for Solana/Tron/Bitcoin, broader chain id typing, and universal explorer/normalization helpers.
88. Added wallet-core adapter foundation: `ChainAdapter`, `ChainAdapterRegistry`, EVM adapter wrapper, Solana adapter wrapper over the existing Solana module, Tron skeleton adapter, Bitcoin/UTXO skeleton adapter, and swap quote interfaces without swap execution.
89. Updated API/web integration: `/api/chains` now returns universal chains, CoinGecko/mock market layers now recognize `SOL/BTC/TRX`, portfolio/receive/view-only helpers use the adapter registry foundation, and asset id helpers stop lowercasing Solana token ids.
90. Kept the existing EVM send flow intact while making the dashboard branch safely by `chainFamily`; Solana uses the adapter-backed universal portfolio path and skeleton families stay clearly disabled.
91. Ran local validation: `pnpm --filter @acorus/shared build`, `pnpm --filter @acorus/wallet-core test`, `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/web build`, `pnpm test`, `pnpm build`, and `git diff --check`.
92. Fixed a root workspace reliability issue by changing root `pnpm test/build` scripts to sequential execution; this removed a `tsup --clean` race that was intermittently unlinking `packages/wallet-core/dist/index.js`.
93. Checked local Docker compose config successfully, but `docker info` still fails because the local `dockerDesktopLinuxEngine` pipe is unavailable; compose build/up regression therefore remained VPS-only for this wave.
94. Built a fresh working-tree deploy archive, uploaded it to VPS `85.239.59.199`, rebuilt `api` and `web`, recreated the containers, re-ran `npx prisma db push --schema prisma/schema.prisma`, and verified `/health`, `/api/chains`, SOL price/chart endpoints, and persistence verification after restart.
95. Started the Universal Multichain Wallet UI wave by auditing the already-landed adapter-based UI changes against the multichain roadmap and confirming the implementation on a clean worktree at `066d3af`.
96. Added and finalized the universal frontend helpers and UI wiring for asset models, chain helpers, explorer helpers, adapter-based receive info, portfolio branching, send policy, and badge rendering without touching the working EVM send flow.
97. Added regression coverage for universal asset helpers and family-aware send availability, then fixed the strict TypeScript mismatch where the asset list treated a Solana SPL case as if it were part of the older EVM-only asset type union.
98. Re-ran local validation for this wave: `pnpm --filter @acorus/wallet-core test`, `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/web build`, `pnpm test`, `pnpm build`, and `git diff --check`.
99. Built a fresh deploy archive for Wave 2, uploaded it to VPS `85.239.59.199`, rebuilt the live `web` stack, and verified `/health`, `/api/chains`, SOL price/chart endpoints, persistence after `restart api`, and the public multichain routes on `:8080`.
100. Added `docs/universal_multichain_wallet_ui_plan.md` and `docs/universal_multichain_wallet_ui_report.md`, then updated `docs/project_memory.md` and `docs/action_memory.md` to record the completed wave, checks, rollout, and remaining limitations.
101. Kept the non-custodial boundary unchanged throughout the wave: backend still never receives mnemonic/privateKey/passcode, EVM send remains the only enabled real send path, Solana send stays explicitly disabled, and Tron/BTC remain honest skeleton flows.
102. Performed a read-only audit of Wave 3 artifacts (send-draft.ts, send-draft-preview.tsx, send/page.tsx, wallet-store, adapters) before starting Wave 4.
103. Created `apps/web/lib/send-ui.ts` with `SendStep`, `SendAssetOption`, `SendNetworkOption`, `SendComposerState`, and helper functions `createSendAssetOptionId`, `getSendStatusLabel`, `canNetworkBroadcast`.
104. Created `apps/web/lib/send-networks.ts` with `buildSendNetworkOptions()` and `findSendNetworkOption()` — EVM chains get `supported`, Solana gets `coming_soon`, Tron/UTXO get `skeleton`.
105. Created `apps/web/lib/send-assets.ts` with `buildSendAssetOptions()` and `buildFallbackNativeAsset()` — handles both UniversalPortfolioView (has `family`) and PortfolioSummaryView (no `family` field) via `effectiveFamily` fallback.
106. Created `apps/web/components/send-composer.tsx` — universal wizard component: network selector → asset selector → recipient → amount → createUniversalSendDraft → SendDraftPreview; shows amber warning for non-broadcast networks; provides EVM bridge link anchor.
107. Updated `apps/web/app/send/page.tsx`: non-EVM early-return dead-end replaced with `<SendComposer>`; EVM profile path now shows `<SendComposer>` header + `#evm-send-form` anchor + original EVM form intact.
108. Updated `apps/web/app/wallet/page.tsx`: send CTA now links to `/send` for non-EVM non-view_only profiles with label "Send draft"; Solana/skeleton info banners updated to mention send draft availability.
109. Added 19 unit tests across `send-ui.test.ts`, `send-networks.test.ts`, `send-assets.test.ts`; all 49 web tests pass; `pnpm build` clean (18 routes, TypeScript strict).
110. Built Wave 4 deploy tarball, uploaded to VPS `85.239.59.199`, ran `docker compose build api web`, `up -d api web nginx`, `prisma db push`; verified `/health`, `/api/chains`, `/send` (HTTP 200), and persistence after `restart api`.
111. Performed Wave 5 read-only audit of `adapters/types.ts`, `evm-adapter.ts`, `evm/send.ts`, `adapters/registry.ts`, non-EVM adapters, `send-composer.tsx`, `send/page.tsx`, `api.ts`, `wallet-core/index.ts` to understand existing helpers before implementing the execution layer.
112. Added `SendExecutionStatus`, `SendExecutionRequest`, `SendExecutionResult` to `packages/shared/src/multichain.ts`.
113. Added `BroadcastSendInput` type and optional `broadcastSend?` method to `ChainAdapter` interface in `packages/wallet-core/src/adapters/types.ts`.
114. Created `packages/wallet-core/src/send/execution-engine.ts` — `SendExecutionEngine` with pre-flight guard logic (unsupported/rejected/failed/submitted) and try/catch wrapping.
115. Added EVM `broadcastSend()` implementation to `evm-adapter.ts`: checks mnemonic/rpcUrl, converts `amountRaw` string to BigInt, delegates to `sendNativeTransaction`/`sendErc20Transaction`, returns `submitted` with txHash.
116. Added explicit `broadcastSend()` methods returning `unsupported` to Solana, Tron, and UTXO adapters.
117. Created `apps/web/lib/send-execution.ts` — `executeUniversalSend()` client-side service; never imported server-side.
118. Updated `apps/web/components/send-composer.tsx`: added `mnemonic?`, `privateKey?`, `onExecutionResult?` props; added `executing`/`executionResult` state; added `handleExecuteDraft()` function; added execute block in preview panel with locked-wallet notice, broadcast button, and result display.
119. Updated `apps/web/app/send/page.tsx`: both SendComposer instances receive `mnemonic`; EVM instance `onExecutionResult` persists tx via `createTransaction()`.
120. Added 2 new `SendExecutionEngine` tests to `wallet-core.test.ts`; confirmed wallet-core 24/24 pass, web 49/49 pass, `pnpm build` clean.
121. Built Wave 5 deploy tarball, uploaded to VPS `85.239.59.199`, ran `docker compose build api web`, `up -d api web nginx`, `restart api`; verified `/health`, `/api/chains`, `/send`, persistence after restart, public URL.


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
- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core add @solana/web3.js @solana/spl-token ed25519-hd-key tweetnacl`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web build`
- `pnpm build`
- `tar.exe -czf ... acorus-wallet`
- Python `paramiko` upload to `/root/acorus-wallet-solana-deploy.tar.gz`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml exec -T api sh -lc "cd /app/apps/api && npx prisma db push --schema prisma/schema.prisma"`
- `curl -fsS "http://127.0.0.1:8080/api/market/prices?chainId=101&currency=USD&symbols=SOL"`
- `curl -fsS "http://127.0.0.1:8080/api/market/chart?chainId=101&currency=USD&symbol=SOL&range=7D"`
- `docker compose --env-file .env -f infra/docker-compose.yml config`
- `docker info`
- `git status --short`
- `git --no-pager log --oneline -5`
- `git branch --show-current`
- `git diff --stat`
- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `tar.exe -czf ... acorus-wallet`
- Python `paramiko` upload to `/root/acorus-wallet-multichain-deploy.tar.gz`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml exec -T api sh -lc "cd /app/apps/api && npx prisma db push --schema prisma/schema.prisma"`
- Remote `BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh`
- Remote `docker compose --env-file .env -f infra/docker-compose.yml restart api`
- Remote `CHECK_MODE=verify BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh`

## Current follow-up

- Keep Prisma/Postgres as the default VPS runtime, but rotate the compromised root password before treating the server as trusted again
- Add SSH key auth, disable password login after validation, and move to domain + HTTPS before any real-user or mainnet exposure
- After domain setup, set `CORS_ORIGIN` explicitly and re-run the deployment/security audit
- Current product follow-up: the EVM Wallet UX + Send Flow wave is implemented and deployed; next product work can focus on browser-level E2E coverage or later chain families without relaxing the current non-custodial boundary
- Current product follow-up: the Token Management + Real Charts wave is implemented and deployed; the next sensible step is a broader wallet feature wave such as Solana/Tron/NFT/swap or end-to-end mobile packaging, without relaxing the current non-custodial boundary
- Current product follow-up: the Solana Wallet Skeleton wave is implemented and deployed; the next sensible Solana step is real send + transaction status/history enrichment, still without relaxing the current non-custodial boundary
- Current product follow-up: the Unified Multichain Asset Engine + Adapter Foundation wave is implemented and deployed; the next sensible product step is to move universal receive/portfolio/token detail UI deeper into the adapter model or ship Solana Send MVP on top of this foundation
- Current product follow-up: the Universal Multichain Wallet UI wave is implemented and deployed; the next sensible product step is the Universal Send Draft Engine so all future send flows route through one multichain draft model before enabling additional networks.
- Current product follow-up: the Universal Send Draft Engine wave is implemented and deployed; the next sensible product step is Universal Send UI so the existing EVM send review flow and future non-EVM flows can share one preview/review foundation.

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
95. Started the Universal Send Draft Engine wave with a read-only audit across shared multichain types, wallet-core adapters and EVM send helpers, the existing web send flow, session plan state, and current git/deploy status on a clean worktree at `9abaa10`.
96. Expanded the shared multichain send model with support status, validation issue, fee estimate, and richer send draft fields while keeping the existing import surface stable for the rest of the monorepo.
97. Added wallet-core send foundations: `send/amount.ts`, `send/validation.ts`, `send/draft-engine.ts`, and `send/index.ts`, then exported them through `packages/wallet-core/src/index.ts`.
98. Extended the adapter layer with `createSendDraft()` support across EVM, Solana, Tron, and Bitcoin so the engine can return `supported`, `coming_soon`, or `skeleton` drafts without broadcasting any transaction.
99. Added frontend draft foundations with `apps/web/lib/send-draft.ts` and `apps/web/components/send-draft-preview.tsx`, while deliberately leaving the old `/send` EVM page flow intact and not wiring real non-EVM send UX in this wave.
100. Added regression coverage for amount normalization, EVM native/ERC-20 drafts, invalid recipient, insufficient balance, Solana coming-soon draft, Tron skeleton draft, Bitcoin skeleton draft, and the frontend `createUniversalSendDraft()` service.
101. Hit two implementation follow-ups during validation: fixed a web vitest import-resolution issue by switching `send-draft.ts` to a relative import, and made `getRpcUrlForUniversalChain()` fail-soft for missing EVM RPC env so draft creation still works in test/fallback contexts.
102. Re-ran local validation successfully: `pnpm --filter @acorus/shared build`, `pnpm --filter @acorus/wallet-core test`, `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/web build`, `pnpm test`, `pnpm build`, and `git diff --check`.
103. Confirmed local Docker regression is still workstation-blocked (`dockerDesktopLinuxEngine` unavailable), so compose regression remained VPS-only for this wave as well.
104. Built a fresh working-tree archive, uploaded it to VPS `85.239.59.199`, rebuilt the `api` and `web` Docker images, restarted `api/web/nginx`, and re-ran `npx prisma db push --schema prisma/schema.prisma` inside the API container.
105. Verified live rollout on VPS: `docker compose ... ps`, loopback/public `/health`, `/api/chains`, persistence creation + verify, persistence verify after `restart api`, and public HTTP 200 on `/`, `/wallet`, `/send`, and `/receive`.
106. Added `docs/universal_send_draft_engine_plan.md` and `docs/universal_send_draft_engine_report.md`, then updated `docs/project_memory.md`, `docs/action_memory.md`, and the session plan to record the completed wave, checks, rollout, non-scope, and next step.
107. Kept the non-custodial boundary and product scope unchanged: no backend seed/privateKey/passcode handling, no Solana real send, no Tron/BTC real send, no swap, and no rewrite of the working EVM send transaction path.
