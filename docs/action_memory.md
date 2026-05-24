# Action Memory

## Executed actions

1. Reworked the product-facing web shell toward the requested Uniswap-like direction: added a light token hero with floating selectable token bubbles, updated the top wallet navigation to a brighter glass style, and reused the hero on `/swap`.
2. Added visual token quick-pick grids inside `SwapComposer` and `SendComposer`, so assets can now be selected by clicking token cards instead of only using dropdown fields.
3. Added wallet-side token selection state: asset rows can now be highlighted and the selected token is surfaced in a spotlight card with send/receive/detail actions.

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
122. Re-aligned the active project plan away from any single-chain priority and fixed the product direction as a universal multichain wallet + swap + dapp shell.
123. Audited the current adapter contract, swap placeholder types, README, architecture doc, and roadmap doc to identify where the repository still described the product in chain-specific terms.
124. Added `docs/adapter_expansion_roadmap.md` with the capability matrix, universal adapter contract, rollout sequence across EVM/Solana/Tron/UTXO/TON, UX rules, and security invariants.
125. Updated `README.md`, `docs/architecture.md`, and `docs/roadmap.md` so the repository now consistently describes Acorus Wallet as adapter-first and universal-first rather than “EVM MVP → Solana next”.
126. Updated `docs/project_memory.md` and `docs/action_memory.md` to record the roadmap alignment step; no runtime code or deployment changed during this documentation milestone.
127. Added `docs/universal_swap_shell_plan.md` to define the universal swap shell as one quote/review/approval/execute engine with provider abstraction, capability gating, rollout phases, and client-side security invariants.
128. Added `docs/universal_dapp_shell_plan.md` to define the universal dapp shell as one session/permission/signing approval model across families, with EVM as the first reference adapter rather than the product identity.
129. Updated `README.md` and `docs/project_memory.md` so the new swap/dapp planning documents are part of the recorded product direction and repository entrypoints.
130. Started Wave 6 with a read-only audit across the current swap types, adapter registry, API app/tests/store, universal web helpers, docs, local git state, and VPS health endpoints.
131. Replaced the old placeholder swap DTOs with canonical universal quote types in `packages/shared/src/multichain.ts`, then added wallet-core swap provider contracts, a mock universal quote provider, and `SwapQuoteEngine`.
132. Added `POST /api/swap/quote` to the Fastify app, wired it to `createDefaultSwapQuoteEngine()`, and blocked sensitive payload fields such as `mnemonic`, `seed`, `privateKey`, and `passcode` with `sensitive_fields_not_allowed`.
133. Added frontend swap foundations: `getSwapQuote()` in `apps/web/lib/api.ts`, `swap-ui.ts`, `swap-assets.ts`, `SwapRoutePreview`, `SwapComposer`, and `/swap`, while keeping execution disabled and clearly labeled as preview-only.
134. Updated wallet navigation and the wallet dashboard quick actions so Swap is exposed as a universal product action instead of an adapter-specific future branch.
135. Added regression coverage for wallet-core mock swap quotes, API quote route behavior, and frontend swap UI/helper logic; local package tests and full root builds passed cleanly.
136. Fixed the Wave 6 VPS deploy script by correcting the persistence script path from `scripts/check_persistence.sh` to `scripts/check-persistence.sh`, then re-ran the full deployment successfully.
137. Verified the live rollout on VPS: `/health`, `/api/chains`, `/swap`, quote-preview POSTs, sensitive-field rejection, and persistence before/after `docker compose restart api` all passed.
138. Added `docs/universal_swap_quote_engine_plan.md`, `docs/universal_swap_quote_engine_report.md`, and updated project/action/API/README docs so the repository now records the live quote-only swap shell honestly.
139. Started the wallet benchmark wave with a read-only audit across current docs, wallet navigation, dashboard layout, product shell routes, shared adapter/swap contracts, local git state, VPS health, and official MetaMask / Trust Wallet / Uniswap Wallet / PancakeSwap product positioning.
140. Started the Universal dApp Live Bridge wave with a read-only audit across the shared dApp contract, extension background/content/inpage/provider files, popup/options shells, current `/dapps` and `/extension` pages, roadmap docs, and session plan notes.
141. Extended `packages/shared/src/dapp.ts` with live origin bridge state, provider exposure mode, approval-required proposal helpers, active-chain updates, and origin bridge snapshot helpers; added shared unit coverage in `packages/shared/src/dapp.test.ts`.
142. Upgraded the extension runtime so `acorus_requestAccounts`, `acorus_accounts`, `acorus_chainId`, and `acorus_switchChain` now route through the existing session registry in preview-backed mode, while sign/send methods remain explicitly disabled.
143. Updated content/inpage bridge behavior so webpages receive live origin state updates from the extension and the injected provider now tracks connection state plus account/chain change events.
144. Updated popup/options and web `/dapps` + `/extension` shells so the product now describes the bridge honestly as live for connect/network metadata, without implying signing or broadcast support.
140. Added benchmark and roadmap docs: `docs/wallet_competitor_benchmark.md`, `docs/chrome_extension_roadmap.md`, `docs/product_ux_upgrade_plan.md`, and `docs/wallet_product_benchmark_ux_upgrade_report.md`.
141. Added `apps/web/lib/product-features.ts` plus `apps/web/lib/product-features.test.ts`, then created `ProductFeatureCard` and `WalletActionGrid` so the wallet dashboard can expose live, preview, and planned product surfaces without implying fake execution.
142. Added shell routes for `/explore`, `/security`, `/dapps`, `/extension`, and `/quests`, using placeholder-safe messaging for Web3 discovery, permissions, Chrome extension planning, and gamified onboarding.
143. Updated `apps/web/components/wallet-nav.tsx`, `apps/web/app/wallet/page.tsx`, `apps/web/app/globals.css`, and `README.md` so the top-level product shell now reflects universal wallet + DEX shell + dApp shell direction more clearly.
144. Kept non-custodial and execution boundaries unchanged: did not add WalletConnect, extension provider injection, dApp connection runtime, swap execution, token approvals, new signing paths, or any backend handling of mnemonic/privateKey/passcode.
145. Re-ran local validation for the wave: web tests, web build, root tests, root build, and `git diff --check`; local Docker remained workstation-blocked on `dockerDesktopLinuxEngine`.
146. Deployed the UX shell wave to VPS `85.239.59.199`, rebuilt `api` and `web`, re-ran `prisma db push`, verified public routes for wallet/explore/security/dapps/extension/quests/swap, and re-checked persistence before and after `docker compose restart api`.
147. Updated `docs/project_memory.md` and `docs/action_memory.md` to record changed files, validation, rollout status, non-scope, and the next recommended step: a Chrome Extension Architecture Skeleton without live site connectivity.
148. Started the Chrome Extension Architecture Skeleton wave by auditing the session plan, root workspace scripts, current extension roadmap docs, and recent repo state on top of `b66789b`.
149. Added `apps/extension` as a new workspace package with a Manifest V3 build pipeline, static popup/options HTML, and bundled output entrypoints for background, content, inpage, popup, and options surfaces.
150. Added shared extension protocol/types in `apps/extension/src/shared/protocol.ts`, including message bus envelopes, permission model types, skeleton state helpers, extension phases, and protocol tests.
151. Added a safe runtime skeleton: storage-backed permission placeholder, background message router, content-to-inpage bridge, and `window.acorus` stub provider that rejects all live account methods except a ping-style skeleton response.
152. Added popup and options shells so the extension package already communicates scope, phases, and safety constraints without pretending live connectivity exists.
153. Added `docs/chrome_extension_architecture_skeleton_plan.md` and `docs/chrome_extension_architecture_skeleton_report.md`, then updated README, architecture, roadmap, project memory, and action memory to reflect the new extension package and unchanged safety boundary.
154. Kept runtime non-scope intact: no WalletConnect, no `window.ethereum` compatibility runtime, no live dApp connectivity, no signing/broadcast, and no backend handling of mnemonic/privateKey/passcode.
155. Re-ran local validation for the extension wave: `pnpm --filter @acorus/extension test`, `pnpm --filter @acorus/extension build`, root `pnpm test`, root `pnpm build`, and `git diff --check`.
156. No VPS rollout was required for this wave because the extension skeleton is repository-only and does not change the deployed web/api runtime.


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
- `docker info`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `python -c "... paramiko ... docker compose ps / health / chains audit ..."`
- `python scripts/deploy_wave6.py`
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
- Current product follow-up: the Universal Swap Quote Engine + Swap Shell MVP is implemented and deployed; the next sensible product step is live provider integration (0x/1inch/ParaSwap for EVM, then Jupiter/SunSwap/cross-chain providers) without relaxing the current non-custodial boundary.
- Current product follow-up: the wallet benchmark + UX shell wave is implemented and deployed; the next recommended step is a Chrome Extension Architecture Skeleton (Manifest V3, background/content/inpage/popup/message bus/permission types) without live site connectivity yet.
- Current product follow-up: the Chrome Extension Architecture Skeleton wave is implemented locally; the next recommended step is a Universal dApp Session / Permission Shell layered onto this skeleton before enabling any real site connectivity.

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
108. Started the Universal dApp Session / Permission Shell wave with a read-only audit across the current `/dapps` page, extension protocol/store/popup/options files, adapter capabilities, README/docs state, and the existing plan/checkpoint context on top of commit `3481484`.
109. Added a shared dApp domain layer in `packages/shared/src/dapp.ts`: canonical proposal/session/request/approval/snapshot types, permission definitions, preview seed state, and reducer-style approve/reject/revoke helpers.
110. Extended wallet-core adapter capability metadata with `dapp`, then marked the current EVM/Solana/Tron/UTXO adapters honestly as `dapp: false` until a later live connectivity wave.
111. Reworked the extension permission store into a preview dApp shell store, upgraded the background message router with approve/reject/revoke actions, and updated popup/options surfaces to render real preview proposals, request queue, connected sites, and approval history.
112. Replaced the old static `/dapps` placeholder with a real interactive preview shell driven by shared dApp types, reducer helpers, and local preview state; updated product feature metadata so dApps now render as `Preview`.
113. Added `docs/universal_dapp_session_permission_shell_plan.md` and `docs/universal_dapp_session_permission_shell_report.md`, then updated README, architecture/roadmap, extension roadmap, and project memory to reflect that the permission/session shell is now implemented in preview mode.
114. Started the Universal dApp Signing / Transaction Approval wave with a read-only audit across `packages/shared/src/dapp.ts`, extension background/protocol/store files, popup/options shells, and the current session plan/todos after the live bridge wave.
115. Extended the shared dApp contract with queued provider-request helpers, request lookup helpers, request-kind permission mapping, and approved-preview result objects so approval runtime behavior is defined in the domain layer instead of only inside the extension worker.
116. Expanded the extension protocol to recognize `acorus_signMessage`, `acorus_signTypedData`, `acorus_signTransaction`, and `acorus_sendTransaction`, and added protocol/shared tests for the new method surface and preview result flow.
117. Reworked `apps/extension/src/background/index.ts` so sign/transaction provider requests enter the stored pending-request queue, stay unresolved in memory until popup/options approve or reject them, and return explicit preview approval results or rejection errors back to the requesting page.
118. Updated revoke-session behavior to cancel any still-pending provider promises for that session instead of leaving page calls hanging after session teardown.
119. Refreshed popup/options copy plus `/dapps`, `/extension`, product feature metadata, README, and project memory so the product now honestly states that approval review is live while real signatures, broadcast, wallet-backed provider exposure, and WalletConnect remain disabled.
120. Started the EVM Provider Compatibility wave with a read-only audit across the extension inpage/provider runtime, protocol tests, popup/options copy, `/dapps`, `/extension`, README, architecture, and extension roadmap state after the approval-review wave.
121. Added `apps/extension/src/shared/evm-compat.ts` plus `evm-compat.test.ts` so the EVM method surface, chain-id formatting, switch-chain parsing, and Acorus-method mapping are defined and regression-tested as a separate compatibility layer.
122. Reworked `apps/extension/src/inpage/index.ts` so the extension now injects preview-backed `window.ethereum` compatibility next to `window.acorus`, emits Ethereum-style account/chain/connect/disconnect events, supports legacy `send`/`sendAsync` helpers, and maps common EVM wallet methods into the existing Acorus bridge and approval queue.
123. Updated popup/options shells plus web `/dapps` and `/extension` surfaces so the product now advertises preview-backed EVM compatibility honestly while keeping real signature output, real broadcast, wallet-backed execution, and WalletConnect disabled.
124. Refreshed README, architecture, extension roadmap, and project memory so repository documentation now matches the live preview-backed `window.ethereum` surface and still preserves the non-custodial safety boundary.
125. Started the Wallet-backed Public Account Bridge wave by auditing the extension permission store, background router, content script, shared dApp types, and web layout/runtime after the EVM compatibility wave.
126. Extended `packages/shared/src/dapp.ts` so proposals and sessions now carry provider exposure mode metadata, plus new trusted wallet-sync envelope types for public-profile handoff from the web app to the extension.
127. Reworked the extension background permission store to maintain a synced public EVM wallet registry in `chrome.storage.local`, reconcile preview demo/session state against synced wallet accounts, and create new connection proposals in `wallet_backed` mode when local EVM profiles are available.
128. Updated the content script and background protocol so only trusted Acorus web-app origins can post wallet-sync envelopes, then added extension popup/options state to display synced wallet accounts and bridge exposure mode.
129. Added `apps/web/components/extension-profile-sync.tsx` and mounted it from the root layout so the PWA automatically syncs only public local EVM profile addresses into the extension running in the same browser profile; `/dapps` and `/extension` copy were updated to describe the new bridge mode honestly.
130. Re-ran local validation successfully: `pnpm --filter @acorus/shared test`, `pnpm --filter @acorus/extension lint`, `pnpm --filter @acorus/extension test`, `pnpm --filter @acorus/extension build`, `pnpm --filter @acorus/web test`, and `pnpm --filter @acorus/web build`.
131. Started the Universal Account Exposure Controls wave after explicitly dropping the Solana-specific next-step focus and re-centering the extension roadmap on privacy-first multi-wallet behavior.
132. Reworked the bridge wallet exposure logic so synced public accounts now resolve to a single selected default account for new proposals instead of exposing every synced address to every dApp by default.
133. Extended the extension protocol/background runtime with `select_wallet_profile` and `set_session_account`, allowing popup/options to change the default account for new connections and switch the exposed account for an already active site session.
134. Updated popup/options UI so proposals show the one account being approved, synced wallet cards can set the default account, and connected-site cards can switch their exposed account without weakening the non-custodial boundary.
135. Updated `/extension` and `/dapps` copy plus extension phase labels so the product now describes universal account controls and WalletConnect-later flow rather than a Solana-specific next phase.
136. Re-ran local validation successfully after a strict-TypeScript fix in `permission-store.ts`: `pnpm --filter @acorus/shared test`, `pnpm --filter @acorus/extension lint`, `pnpm --filter @acorus/extension test`, `pnpm --filter @acorus/extension build`, `pnpm --filter @acorus/web test`, and `pnpm --filter @acorus/web build`.
137. Started the WalletConnect Preview Shell wave by auditing the shared dApp transport model, extension protocol/background/options surfaces, `/dapps`, `/extension`, and the extension roadmap after universal account controls landed.
138. Extended `packages/shared/src/dapp.ts` so dApp proposals/sessions now carry a transport field and WalletConnect URIs are converted into redacted preview metadata immediately instead of persisting raw pairing secrets.
139. Added a preview-only WalletConnect pairing import path to the extension runtime: protocol/background now accept queued pairings, the permission store maps them onto the same proposal/session registry, and options can paste a WalletConnect URI without enabling live relay/sign/broadcast behavior.
140. Updated popup/options plus web `/dapps` and `/extension` surfaces so injected sites and WalletConnect peers now render side by side with transport labels, wallet-backed account exposure rules, and explicit copy about redacted pairing secrets.
141. Started the Multichain Session Request Shell wave by auditing the newly landed WalletConnect preview flow, the shared request model, extension store/router, options UI, and `/dapps` preview state for the next universal follow-up step.
142. Extended `packages/shared/src/dapp.ts` so requests now carry transport metadata, active sessions can spawn preview-only follow-up requests with explicit chain/account context, and preview summaries/warnings are generated consistently per transport.
143. Added a new extension runtime path for queuing session request previews, normalized stored extension snapshots so older request/proposal/session state picks up transport defaults safely, and wired the options shell with a session request studio for approved peers.
144. Updated popup/options plus web `/dapps`, `/extension`, and the extension roadmap so the product now advertises transport-aware multichain session request staging honestly while keeping live signing, WalletConnect relay, and broadcast disabled.
145. Fetched the latest GitHub state, reviewed the remote-only commits between local `907d526` and remote `c374bff`, then fast-forwarded local `main` to the new head while preserving unfinished local work in `git stash` as `copilot-pre-sync-local-work`.
146. Re-ran workspace dependency linking with `pnpm install --frozen-lockfile`, which restored the new extension/shared workspace graph so `@acorus/shared` resolved correctly inside the freshly added extension wallet tests.
147. Audited the refreshed codebase, roadmap, extension roadmap, and UX surfaces after the remote sync to re-center the next implementation slice around premium wallet UX plus the future extension signer unlock path.
148. Applied a premium DeFi visual refresh across `apps/web/app/globals.css`, homepage, wallet navigation, wallet dashboard, portfolio summary, asset list, explore, extension landing page, send composer, swap composer, product feature cards, wallet health, and capability board using richer gradient glass surfaces and tighter action-first hierarchy.
149. Validation after the sync and UI wave: `pnpm test` passed across shared, wallet-core, api, extension, and web; `pnpm --filter @acorus/web build` also passed on the refreshed shell.
150. Repo-wide `pnpm lint` remains blocked by pre-existing TypeScript issues under `apps/api`; those errors were not introduced by the new UI wave and were intentionally left untouched during this styling-focused pass.
151. Implemented the extension signer unlock layer: approving a queued dApp request now moves it into a separate signer confirmation gate in background memory instead of resolving the dApp immediately.
152. Updated extension protocol/background/popup/options so signer-gated requests disappear from the generic request queue, surface in a dedicated confirmation section, and only resolve back to the site after explicit confirm/reject actions.
153. Refreshed `/extension` and `docs/chrome_extension_roadmap.md` so the public roadmap now states that a signer-confirmation gate is live while real signing output and broadcast still remain disabled.
154. Validation for the signer unlock wave: `pnpm --filter @acorus/extension test` and `pnpm --filter @acorus/extension build` both passed.
155. Wired the signer-confirmation path to real extension-side EVM execution: approved `acorus_signMessage`, `acorus_signTypedData`, `acorus_signTransaction`, and `acorus_sendTransaction` requests now execute inside the extension wallet and resolve back to the requesting page with a real signature or transaction hash only after explicit confirmation.
156. Fixed the extension state contract so execution availability is no longer hard-coded as disabled, then updated popup/options copy to distinguish live EVM execution from preview-only WalletConnect pairing and staged multichain session requests.
157. Refreshed `/dapps`, `/extension`, README, architecture, and `docs/chrome_extension_roadmap.md` so product and repo documentation now match the current boundary: live EVM sign/send execution after signer confirmation, but no WalletConnect relay or broader non-EVM provider execution yet.
158. Re-ran `pnpm --filter @acorus/extension test` and `pnpm --filter @acorus/extension build`; both passed on the live-execution-aligned state.
159. Added `apps/extension/src/background/request-risk.ts` plus dedicated tests so the extension can classify risky approval payloads locally before user confirmation.
160. Extended the approval flow to generate request-specific warnings for sign-message phishing risk, typed-data domain/verifying-contract context, generic contract calls, ERC-20 `approve`, and NFT `setApprovalForAll`.
161. Updated popup/options request cards and signer-confirmation cards so the computed risk warning remains visible across both approval stages instead of collapsing to one generic signer-gate message.
162. Re-ran `pnpm --filter @acorus/extension test` and `pnpm --filter @acorus/extension build`; both passed after the approval-risk review wave.
163. Started the Chrome Extension Multichain Wallet Parity wave by auditing the current extension background wallet/router, permission store, shared protocol, EVM compatibility layer, inpage/content scripts, popup/options UI, shared chains/multichain types, wallet-core EVM client, and docs memory.
164. Added extension-local storage helpers, a multichain registry, custom EVM network persistence with `eth_chainId` RPC validation, active extension chain state, and an extension portfolio snapshot service.
165. Reworked `wallet_addEthereumChain` / `acorus_addChain` and `wallet_watchAsset` / `acorus_watchAsset` so they now perform real extension storage operations instead of only entering the preview approval queue.
166. Expanded shared chain metadata and wallet-core viem support to include Avalanche, Linea, Fantom, Sei, opBNB, and zkSync Era while keeping Solana/Tron/BTC/TON capability-gated.
167. Rebuilt the popup home around the runtime portfolio snapshot: account selector, network selector, active network switcher, honest asset source labels, receive composer, and safe Buy/Swap/Send panels replaced the fake hardcoded portfolio list as the main source.
168. Added registry/assets tests for network family coverage, unknown chain rejection, custom EVM validation, duplicate builtin protection, watched ERC-20 persistence, invalid token rejection, hide/unhide, and stable asset ids.
169. Local validation so far: `pnpm --filter @acorus/extension test`, `pnpm --filter @acorus/shared build`, `pnpm --filter @acorus/wallet-core build`, `pnpm --filter @acorus/extension lint`, and `pnpm --filter @acorus/extension build` all passed.
170. Browser visual automation was attempted through the Codex browser integration, but no active browser pane was available; verification continued through tests and extension build output.
171. Ran the full workspace validation: `pnpm test` passed; the first `pnpm build` hit a transient Turbopack workspace-resolution error for `@acorus/shared`, then `pnpm --filter @acorus/web build` and a second `pnpm build` both passed.
172. Ran `git diff --check` successfully and packaged the extension with `pnpm extension:package`, refreshing `apps/web/public/downloads/acorus-wallet-extension.zip`.
173. Started the Extension Parity Stabilization wave after commit `ad77ae9`, focusing on approval prompts, safe receive behavior, duplicate inpage injection, all-network popup mode, and custom EVM client execution.
174. Moved `acorus_addChain` and `acorus_watchAsset` back into the extension approval queue so dApps no longer cause silent persistence; popup approval now executes validation/storage for these non-signer requests without requiring signer unlock.
175. Added explicit add-chain/watch-asset request summaries, user rejection propagation, custom RPC `eth_chainId` validation with an 8 second timeout, and default blocking for localhost/private RPC URLs.
176. Removed content-script inpage DOM injection so Manifest V3 MAIN-world injection is the single source for `window.ethereum` / `window.acorus`.
177. Added popup `All networks` mode and fixed receive composer rendering so selected EVM/Solana/Tron networks expose only the matching address family while BTC/TON remain coming soon.
178. Extended wallet-core EVM clients with `createCustomViemChain` and custom client options, then wired extension sign/send transaction preparation to saved custom EVM network configs.
179. Added stabilization tests for add-chain/watch-asset approval queue behavior, no duplicate inpage injection, receive composer family filtering, and custom viem chain config.
180. Stabilized Vitest config for slow local crypto/jsdom execution on Windows by adding explicit wallet-core/extension test timeouts and a web jsdom setup that restores localStorage before each test.
181. Completed validation for the stabilization wave: shared build, wallet-core build, extension lint/test/build, web test/build, full `pnpm test`, full `pnpm build`, `git diff --check`, and `pnpm extension:package` all passed.
182. Refreshed the downloadable extension archive at `apps/web/public/downloads/acorus-wallet-extension.zip` after the successful extension package run.
183. Checked `24wallet.ru` routing: DNS resolves to `85.239.59.199`; HTTP serves Acorus wallet, but HTTPS redirects to `/login?next=%2F`, indicating the SSL nginx vhost is still pointed at the wrong app.
184. Started the Multichain Extension UX + Portfolio Pricing + Manual Smoke Harness wave after commit `b3dc7f5b6c39902eda3a72b2982c7c9c6362d5a5`.
185. Added structured dApp request review details for add-chain/watch-asset approvals so popup can render network/token cards without raw JSON.
186. Expanded popup UX with a separate account selector panel, grouped searchable network selector, capability badges, lock status, and live receive-family updates.
187. Added extension portfolio price enrichment through public `/api/market/prices` using only chain id, symbol, and token address metadata with safe fallback on API failure.
188. Added `/extension-smoke` as a manual dApp/provider smoke harness for injected provider detection and core EIP-1193 checks.
189. Completed validation for the multichain UX/pricing/smoke wave: shared build, wallet-core build, extension lint/test/build, web test/build, full `pnpm test`, full `pnpm build`, `git diff --check`, and `pnpm extension:package` all passed.
190. Fixed production nginx HTTPS routing for `24wallet.ru` and `www.24wallet.ru`, backed up touched configs to `/root/backups/acorus-wallet-nginx-https-fix_20260519_130515/`, issued a Let's Encrypt certificate, reloaded nginx, and verified wallet HTTP/HTTPS responses.
191. Added wallet-core Solana live wallet helpers for RPC timeout, explorer links, amount parsing/formatting, native SOL send draft validation, client-side SOL send execution, and Solana message signing.
192. Enabled Solana live portfolio in the extension snapshot by reading SOL and SPL token balances through Solana RPC and marking Solana balance/send capabilities as ready while keeping swap disabled.
193. Added extension popup Solana send composer, `queue_solana_send` runtime message, internal `multichain_send` approval queueing, Solana send approval detail cards, and execution through the unlocked extension vault after signer confirmation.
194. Expanded the injected Solana provider subset with `isConnected`, connect/disconnect events, public key access, and sign-message flow, then added Solana diagnostics to `/extension-smoke`.
195. Updated web send status/policy tests so Solana is treated as supported instead of coming soon; Tron/BTC/TON remain gated.
196. Completed local validation for the HTTPS/Solana MVP wave: shared build, wallet-core build/test, extension lint/test/build, web test/build, full `pnpm test`, full `pnpm build`, `git diff --check`, and `pnpm extension:package` all passed.
197. Deployed this wave to `/opt/acorus-wallet-release-current` by uploading a clean git archive to the VPS, copied the existing production `.env`, rebuilt/recreated the Acorus Docker Compose services, and verified `https://24wallet.ru/extension-smoke` returns `200 OK`.
198. Started the HTTPS Enforcement + Extension Smoke Verification + SPL Transfer Foundation wave after commit `5452cd5168a4425dadece78c5a37b90f58c81b2d`.
199. Updated the VPS nginx `24wallet.ru` vhost with a backup at `/root/backups/acorus-wallet-nginx-https-enforcement_20260519_151649/`, then split HTTP redirects, canonical HTTPS proxying, `www` canonical redirects, and HSTS.
200. Verified server routing: `http://24wallet.ru`, `http://www.24wallet.ru`, and `https://www.24wallet.ru` redirect to canonical HTTPS; `https://24wallet.ru` returns `200 OK` with HSTS; `/extension-smoke` renders over HTTPS.
201. Hardened extension market API fallback order so `https://24wallet.ru` is first and public price requests contain only chain/symbol/token metadata.
202. Added wallet-core SPL transfer foundation: SPL mint/owner validation, ATA derivation/checking, draft validation, fee estimate helper, and execution that can create a missing recipient ATA after explicit confirmation.
203. Extended extension Solana send queue, execution parsing, shared review details, and popup approval card rendering for SOL and SPL assets, including token mint, estimated fee, and ATA warning.
204. Updated popup Send so it lists SOL plus discovered SPL balances and sends selected asset metadata through `queue_solana_send`.
205. Expanded `/extension-smoke` with protocol/origin/security status, provider event log, Solana capability display, copy diagnostics, and clear log controls.
206. Added tests/source guards for HTTPS API priority, SPL draft validation, SPL approval card rendering, SPL send composer, and smoke diagnostics controls.
207. Completed local validation for this wave: shared build, wallet-core build/test, extension lint/test/build, web test/build, full `pnpm test`, full `pnpm build`, `git diff --check`, and `pnpm extension:package` all passed.
208. Committed and pushed the wave as `dcea769` with message `Enforce wallet HTTPS and add Solana SPL transfer foundation`.
209. Deployed the pushed archive to `/opt/acorus-wallet-release-current`, rebuilt the Docker Compose web/API services, and verified `/extension-smoke` now contains the new diagnostics UI markers.
210. Rechecked production after deployment: canonical HTTPS has HSTS, HTTP and `www` redirect to `https://24wallet.ru`, `/health` returns `200 OK`, and market prices return `200 OK`.
211. Started the EVM Swap MVP via 0x API wave after commit `e64ec386ad6a81e6a99088781fb980749065a167`, audited shared multichain/chains, wallet-core EVM client/send files, API app/env/logger, extension protocol/background/popup/assets, web swap/API bridge, smoke harness, README, roadmap, and memory docs.
212. Confirmed official 0x docs describe the AllowanceHolder flow as `/swap/allowance-holder/price`, allowance review, `/swap/allowance-holder/quote`, then wallet transaction submission, with `0x-api-key` and `0x-version: v2` headers.
213. Added `docs/evm_0x_swap_mvp_plan.md` before implementation, recording current base, new routes/types, security risks, and out-of-scope boundaries.
214. Added shared 0x EVM swap types, backend env/schema support, logger redaction for `ZEROX_API_KEY`, and a backend-only 0x proxy service with 8 second timeout, input validation, safe response mapping, and missing-key `503` behavior.
215. Added wallet-core ERC-20 allowance/approve helpers and tests for stable calldata, invalid spender rejection, native-token allowance bypass, and explicit approval transaction risk labels.
216. Extended extension protocol/background/popup for EVM token approval and 0x swap review queues; stale quotes, chain mismatch, taker mismatch, and invalid transaction payloads are blocked before execution.
217. Replaced the extension popup Swap link with a backend-backed 0x quote composer and added approval cards for ERC-20 approval and 0x swap details without raw calldata rendering.
218. Reworked web `/swap` into an EVM-only 0x MVP composer and added `/extension-smoke` swap diagnostics for provider status and safe price checks.
219. Added docs for the 0x backend proxy, security model, manual smoke, and MVP report, then updated README and roadmap to reflect EVM-only 0x swap MVP scope.
220. Validation completed so far: shared build, wallet-core test, API test/build, extension lint/test/build, web test/build. A first parallel web test hit a transient Windows `EPERM` file-lock during shared `tsup --clean`; rerunning sequentially passed.
221. Completed full workspace validation for the 0x MVP wave: `pnpm test`, `pnpm build`, `git diff --check`, and `pnpm extension:package` all passed, refreshing `apps/web/public/downloads/acorus-wallet-extension.zip`.
222. Committed and pushed the wave with message `Add EVM swap MVP via 0x API`.
223. Checked production `.env` without printing secrets: `ZEROX_API_KEY` is currently not configured on the VPS, so the deployed 0x status must remain `configured:false`.
224. Deployed the pushed archive to `/opt/acorus-wallet-release-current`, rebuilt/recreated the Docker Compose web/API services, and verified `acorus-api` is healthy.
225. Production checks after deploy: `https://24wallet.ru/api/swap/evm/status` returns provider `0x` with `configured:false`, the price route returns expected `503 swap_provider_not_configured`, `/extension-smoke` contains the `EVM 0x swap diagnostics` marker, `/api/market/prices` still returns `200 OK`, and canonical HTTPS remains `200 OK`.
226. Started the 0x production hardening wave from GitHub head `0a4fd03`, completed a read-only audit of backend 0x proxy, env/logger wiring, extension approval queue, popup swap surface, web `/swap`, `/extension-smoke`, and memory/docs before changing code.
227. Verified production and VPS env state without exposing secrets: `https://24wallet.ru/api/swap/evm/status` returns `configured:false`, no `ZEROX_API_KEY` was found in the active Acorus release env files under `/opt/acorus-wallet-release-current` or prior `/opt/acorus-wallet-release-*` directories, and current wallet containers remain healthy.
228. Added `docs/evm_0x_swap_production_hardening_plan.md` plus SQL todo tracking for env activation, metadata hardening, allowance/quote locking, and swap history/deploy work.
229. Added shared EVM swap helpers in `packages/shared/src/evm-swap.ts` for decimal-safe amount parsing/formatting, native/curated token metadata, and shorthand display formatting, then added unit coverage in `packages/shared/src/evm-swap.test.ts`.
230. Extended wallet-core token metadata resolution with curated/on-chain/user fallback behavior and safe timeout/fallback handling for custom ERC-20 metadata lookups.
231. Hardened backend 0x responses so token refs now resolve to native/curated/custom metadata, quote payloads include `createdAt`, and quote expiry is shortened for extension freshness handling.
232. Fixed production env wiring by passing `ZEROX_*` variables through `infra/docker-compose.yml`, documented them in `.env.example`, and added `docs/production_0x_env_setup.md` plus `docs/evm_0x_live_quote_smoke_report.md` because live smoke is blocked until a real key is provisioned.
233. Added extension-side safe swap/approval activity storage, surfaced it in popup Activity, enriched approval/swap review cards with formatted allowance and quote details, and added deterministic calldata-hash locking plus trusted-source enforcement before extension swap execution.
234. Upgraded web `/swap` to formatted token amounts, explicit approval queueing via the extension, quote countdown, wrong-chain switching, approval mode selection, and local recent activity history.
235. Expanded `/extension-smoke` with live 0x quote diagnostics, last chain id, and last error code without exposing secrets.
236. Added and updated docs for this wave: production activation plan/report, allowance hardening report, swap history report, security model, manual smoke, API docs, roadmap, README, and project memory.
237. Re-ran local validation for the hardening wave:
   - `pnpm --filter @acorus/shared test`
   - `pnpm --filter @acorus/wallet-core test`
   - `pnpm --filter @acorus/api test`
   - `pnpm --filter @acorus/extension test`
   - `pnpm --filter @acorus/extension build`
   - `pnpm --filter @acorus/web test`
   - `pnpm --filter @acorus/web build`
238. Completed the full hardening validation pass: `pnpm --filter @acorus/shared build`, `pnpm --filter @acorus/wallet-core build`, `pnpm --filter @acorus/wallet-core test`, `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/extension lint`, `pnpm --filter @acorus/extension test`, `pnpm --filter @acorus/extension build`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `pnpm test`, `pnpm build`, `git diff --check`, and `pnpm extension:package` all passed.
239. Committed the hardening wave as `e0a16d5` with message `Harden and activate EVM 0x swap flow`.
240. Deployed commit `e0a16d5` to `/opt/acorus-wallet-release-current`, rebuilt only `api` and `web`, and verified public wallet production health.
241. Public smoke after deploy passed: `https://24wallet.ru` returned `200`, `/health` returned `200`, `/api/swap/evm/status` returned `configured:false`, `/api/swap/evm/0x/price?...` returned `503` as expected without a key, and `/extension-smoke` returned `200`.
242. Pushed commit `e0a16d5` to `origin/main` so GitHub now matches the deployed hardening wave.
243. Ran the next-wave security preflight from local `main`: `git status --short`, `git log --oneline -8`, worktree secret scans, and a narrow git-history scan for `ZEROX_API_KEY`, `0x-api-key`, `privateKey`, `mnemonic`, and `passcode` references. No real 0x key value was found in the repository; only expected env names, logger/test references, and seed/passcode code paths were present.
244. Added `scripts/smoke-zerox-live.mjs` as a read-only live 0x smoke script for `/api/swap/evm/status`, `/price`, and `/quote`, with secret-leak guards over the received payloads.
245. Added `docs/evm_0x_tiny_real_swap_checklist.md` for the first tiny manual real swap on a separate funded test wallet after live quotes are enabled.
246. Added `docs/security_secret_rotation_report.md` documenting that any 0x key seen in chat/logs must be rotated and that VPS root password rotation plus SSH-key-only access are recommended.
247. Updated activation/smoke/manual/API/README/project-memory docs so the next live activation step is explicit: the fresh rotated `ZEROX_API_KEY` must be added manually on VPS without putting it into shell history, after which `node scripts/smoke-zerox-live.mjs` can be rerun.
248. Re-ran public production checks during live-activation prep: `https://24wallet.ru/health` returned `200`, `https://24wallet.ru/api/swap/evm/status` still returned `configured:false`, the public `price` smoke still returned `503`, and `https://24wallet.ru/extension-smoke` returned `200`.
249. Executed `node scripts/smoke-zerox-live.mjs`; it failed early as designed with `0x provider is not configured`, confirming the live activation step remains blocked until a fresh `ZEROX_API_KEY` is manually provisioned on VPS.
250. Diagnosed the blocker safely on VPS without printing secrets: the active release `.env` still has no `ZEROX_*` entries, the API container had no `ZEROX_API_KEY`, and `configured:false` was therefore expected even after service recreation.
251. Found and corrected a release-sync issue on VPS: the earlier archive extraction method had stripped the first path component and failed to update nested files like `infra/docker-compose.yml` reliably. A proper temp-dir sync restored the correct repo structure on the server.
252. After the proper sync, VPS `infra/docker-compose.yml` now includes `ZEROX_*` pass-through, compose config mentions `ZEROX_API_KEY`, and the API container sees `ZEROX_ENABLED=true`; the remaining live-activation blocker is only the missing `ZEROX_API_KEY` entry/value in `/opt/acorus-wallet-release-current/.env`.
253. Used the user-provided 0x key to update `/opt/acorus-wallet-release-current/.env` without printing the value, while also setting `ZEROX_API_BASE=https://api.0x.org`, `ZEROX_API_VERSION=v2`, `ZEROX_ENABLED=true`, and `ZEROX_RATE_LIMIT_PER_MINUTE=30`.
254. Restarted the wallet `api` and `web` services, confirmed the API container sees `ZEROX_API_KEY`, and verified `https://24wallet.ru/api/swap/evm/status` now reports `configured:true`.
255. Investigated the first live `400 swap_bad_request` and confirmed through direct container requests that 0x AllowanceHolder rejects `sellToken=ETH` but accepts native assets as `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`.
256. Patched `apps/api/src/services/zero-x.ts` and API tests so backend 0x requests normalize native aliases to `0xeeee...`, lowercase ERC-20 token addresses, and keep the AllowanceHolder execution model.
257. Investigated the remaining live `400` with a temporary backend debug trace and identified the real root cause: empty `ZEROX_AFFILIATE_FEE_BPS=` was being coerced to `0`, which made the backend send `swapFeeBps=0` and triggered 0x validation requiring `swapFeeRecipient`.
258. Patched `apps/api/src/env.ts` so empty optional numeric env values stay unset, patched `zero-x.ts` so fee params are emitted only when a positive affiliate fee is configured, and removed the temporary debug logging before the final rollout.
259. Re-ran the full validation suite successfully: shared build, wallet-core build/test, API test/build, extension lint/test/build, web test/build, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
260. Deployed the final API fix to `/opt/acorus-wallet-release-current`, rebuilt the wallet API, and rechecked public wallet production endpoints.
261. Final public/live smoke passed: `https://24wallet.ru/health` returned `200`, `/api/swap/evm/status` returned `configured:true`, public native ETH -> USDC `price` and `quote` returned `200`, public USDC -> WETH approval quote returned `200`, `https://24wallet.ru/api/market/prices?...` returned `200`, `https://24wallet.ru/extension-smoke` returned `200`, and `node scripts/smoke-zerox-live.mjs` reported `0x live smoke: PASS`.
262. Did not execute any real swap automatically; browser/manual swap confirmation and the tiny funded-wallet checklist remain explicit human-only follow-up steps.
263. Fast-forwarded local `main` from GitHub `0a4fd03` to `099b0ca` before starting the Explore/token-page wave, because GitHub already contained three newer 0x activation commits.
264. Reviewed official 0x and Uniswap swap docs, then kept the implemented execution model backend-proxied 0x/EVM only while using Uniswap-like token-page product behavior as the UI target.
265. Added `apps/web/lib/token-routes.ts` plus tests so Explore tokens resolve to internal Acorus token detail pages, including EVM contracts, Solana chain-key tokens, and native BTC/SOL/TRX/TON-style fallbacks.
266. Updated Explore token and meme cards so users can click into token pages while keeping external pair/site links as secondary actions.
267. Reworked `/tokens/[chainId]/[tokenAddress]` with a larger market header, source/risk metrics, hoverable chart, `1h/1d/1w/month/year/all time` interval controls, and an embedded 0x swap panel for EVM tokens.
268. Extended shared/web/API chart range types and API validation to `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL`, updating CoinGecko mapping and mock fallback data generation.
269. Made `SwapComposer` accept initial chain/sell/buy token props so token pages preselect the viewed token as the buy side.
270. Validation passed: shared build, token-routes web test, API targeted test, full API test, full web test, API build, wallet-core build, web build, root `pnpm test`, root `pnpm build`, and `git diff --check`. One parallel build attempt hit a Windows `EPERM` file-lock while `api build` and `web build` both cleaned `wallet-core/dist`; rerunning `wallet-core build` and `web build` sequentially passed.
271. Ran a local browser smoke on `http://localhost:3000/tokens/1/native?family=evm&symbol=ETH&name=Ethereum`; token title, market chart, `All time` interval, and embedded `Swap ETH` panel rendered. Explore itself needs the API proxy/API server running locally to populate feed cards; route helper coverage verifies internal token links.
272. Committed and pushed the token detail wave as `3dfc9cb70357c97206a430b0cdf17429964359eb` with message `Add token detail swap pages`.
273. Deployed commit `3dfc9cb` to `/opt/acorus-wallet-release-current` via git archive upload, preserving a server backup at `/root/backups/acorus-token-pages-deploy_20260519_232021`, then rebuilt/recreated Docker Compose `api`, `web`, and `nginx`.
274. Production checks passed after deploy: `https://24wallet.ru`, `/explore`, `/tokens/1/native?family=evm&symbol=ETH&name=Ethereum`, `/tokens/101/NATIVE?family=solana&symbol=SOL&name=Solana`, `/api/market/chart?...range=ALL`, and `/api/swap/evm/status` responded correctly; 0x status remained `configured:true`.
275. Started the Uniswap-like token detail/search/home swap wave after user reported XRP routing, missing token stats, missing links, weak chart ranges, and home swap still feeling like a placeholder.
276. Added canonical CoinGecko token detail and coin chart APIs, market search, DexScreener pool/token search, richer token page details, header search, and a real home 0x EVM swap composer.
277. Removed non-wallet domain references from wallet docs/memory so this repo thread only reports wallet scope.
278. Validation passed locally: `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `pnpm --filter @acorus/api test`, and `pnpm --filter @acorus/api build`.
279. Fixed local development CSP for wallet smoke testing only: production CSP stays strict, while development allows React dev hydration and local API connections.
280. Hardened CoinGecko chart/detail fallback so rate-limited long ranges such as `ALL` no longer render zero-value XRP charts or empty token detail cards.
281. Local API smoke passed for XRP token detail and all chart ranges `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL`; live CoinGecko served most ranges and safe fallback served `ALL` when public max-history calls were rate-limited.
282. Browser smoke passed on `/tokens/coingecko/ripple?source=coingecko&symbol=XRP&name=XRP`: market cap, FDV, 24h volume, high/low, about text, Blockchain/Website/X links, share action, global search, and chart all rendered.
283. Browser smoke passed on `/`: the home screen now renders the backend-proxied 0x EVM swap composer with network/token selectors, sell amount, slippage, and quote action.
284. Committed and pushed the wave as `f7df11a9f42d8a9ad153f943ad83fb37124f7d8a` with message `Add Uniswap-like token details search and home swap`.
285. Deployed `f7df11a` to `/opt/acorus-wallet-release-current`, preserving server backup `/root/backups/acorus-uniswap-like-token-search-swap_20260520_022156`, then rebuilt/recreated wallet `api`, `web`, and `nginx`.
286. Production wallet-only checks passed: `https://24wallet.ru`, `/explore`, `/tokens/coingecko/ripple?...`, `/api/swap/evm/status`, `/api/market/token-detail`, `/api/market/search`, and XRP chart ranges all returned usable responses.
287. Production browser smoke passed: XRP detail page showed market cap, FDV, 24h volume, links, about text, search, and chart; home page showed the 0x EVM swap composer. Live 0x status is configured/enabled and a normal ETH->USDC price smoke returned `200`.
288. Started the white/purple Explore and extension polish wave after the user reported invisible search text, mixed palette, broken token Share, missing top-token loading, weak explorer links, and a too-technical extension popup.
289. Added a white/purple global product skin, explicit market search classes, and lighter panel/card/button overrides so search text is readable and the web app has one visual palette.
290. Replaced `/explore` with `ExploreClient`, adding selectable Trending tokens, Top tokens, Top gainers, Top losers, and Top memes sections plus pagination.
291. Extended `/api/explore/top` with `view`, `page`, and `limit` support and server-side sorting for top/gainers/losers.
292. Updated token pages: Share now uses native share/clipboard fallback, Price source and Chart source cards were removed, and explorer links now show a multi-network dropdown with chain-config fallback URLs for newer EVM networks like Base.
293. Reworked extension popup home/settings UI: balance remains prominent, Send/Receive are large pink action cards, portfolio and recent activity are visible, and settings open as a clean Trust-like settings sheet.
294. Added regression coverage for Explore query params, Base explorer fallback, and the extension wallet/settings UI source guards.
295. Local validation passed for this wave: web test/build, API test, extension lint/test/build, and full workspace `pnpm test`.
296. Local browser smoke passed for Explore rows/search contrast/friendly tab labels and token page Share/metric/source-card behavior. A local production-start token page without same-origin API proxy cannot hydrate CoinGecko detail links, but the API and production nginx path provide `/api` in deployed mode.
297. Started the market UI real-data stabilization wave after the user reported the old hero shell, fake/mock token values, SOL `$150`, broken TON chart ranges, visible Risk/Quote preview cards, and inconsistent palette.
298. Removed public market mock fallbacks from `/api/market/prices`, chart fallback handling, Explore top/trending catch paths, and token source labels so unavailable data now stays unavailable instead of becoming generated prices.
299. Patched CoinGecko chart handling so `the-open-network` maps to `TON` and long-history `ALL` falls back to a live 365-day chart if CoinGecko max/range history is rate-limited.
300. Reworked the home page into a more useful wallet dashboard and removed the previous decorative token spotlight shell.
301. Cleaned token detail UI by removing user-facing Risk, Price source, Chart source, and empty Quote preview surfaces while preserving swap review once a real quote exists.
302. Moved the web root body to a white/purple default palette and added more global transitions/hover polish for panels, buttons, inputs, and market rows.
303. Rebuilt the extension package and attempted an isolated Chrome load smoke; Chrome did not expose the Acorus extension target reliably in this environment, so validation rests on extension lint/test/build/package plus manual install from `apps/extension/dist` or the zip.
304. Local validation passed for this wave: shared build, wallet-core build, API test, web test/build, extension lint/test/build, and `pnpm extension:package`.
305. Local API smoke confirmed TON charts return `symbol=TON` across all ranges and `ALL` now returns live data through the 365-day fallback; Solana detail now returns live CoinGecko price/market data instead of the old mock value.
306. After the first production smoke showed CoinGecko rate-limiting `market_chart` for some long TON ranges, added a CoinGecko OHLC fallback for `1M`, `1Y`, and `ALL` so those ranges can still render real close-price data instead of blank or mock charts.
307. After deploying the OHLC fallback, production still showed `unavailable` for some long TON ranges when several intervals were requested back-to-back. Patched `CompositeMarketDataProvider.getCoinChartById` to wait on the shared CoinGecko limiter instead of immediately throwing `market_rate_limited`.
308. Re-ran targeted validation for the rate-limit queue patch: `pnpm --filter @acorus/api test` and `pnpm --filter @acorus/api build` passed.
309. Added an in-memory last-good cache for `/api/market/coin-chart` so repeated token page interval switches can reuse the last live CoinGecko chart during temporary provider failures instead of rendering empty unavailable charts.
310. Added a real Binance kline fallback for major CoinGecko ids so TON/SOL/BTC/ETH-style token charts can keep rendering real exchange price history when CoinGecko temporarily rejects chart history.
311. Added a real Binance 24h ticker fallback for major token detail pages so temporary CoinGecko metadata failures still show live price/change/high/low/volume plus safe logo/link metadata instead of empty unavailable cards.
312. Started the token-detail/dApps enrichment wave after the user reported missing Zcash/Venice metadata, missing ETH market cap, weak coin descriptions, missing multi-network ETH explorers, and a too-technical dApps page.
313. Extended token detail API/web types with launch date, categories, circulating supply, total supply, and max supply.
314. Hardened CoinGecko detail resolution so `/coins/{id}` failures fall back to `/coins/markets`, then to real Binance 24h price data plus safe public metadata for known assets.
315. Added safe public metadata for Zcash and Venice Token, including descriptions, logos, official/site/social links, and explorer/platform fallbacks.
316. Updated token pages so native ETH-style CoinGecko assets can show multi-network explorers like BaseScan and still prefill the embedded 0x swap composer.
317. Replaced the technical `/dapps` bridge page with a user-facing dApps directory grouped by DeFi, Prediction, Social, and NFTs with search, logos, clickable app cards, and “See more” expansion.
318. Local validation passed: API build, web build, API test, web test, `git diff --check`, root `pnpm test`, root `pnpm build`, and `pnpm extension:package`.
319. Added GeckoTerminal OHLCV fallback for known EVM token charts after production smoke showed Venice Token detail data but empty CoinGecko chart ranges; local Venice Token chart smoke then returned live points for all token-page intervals.
320. Committed and pushed the token enrichment/dApps wave as `2e3a297` with message `Enrich token details and dApps directory`.
321. Deployed `2e3a297` to the wallet production release, preserving server backup `/root/backups/acorus-token-dapps-enrichment_20260520_235920`, then rebuilt/recreated the wallet API and web services.
322. Production smoke after the first deploy confirmed `https://24wallet.ru/dapps`, ETH/ZEC/Venice token detail pages, and the downloadable extension package were reachable.
323. Committed and pushed the Venice chart stabilization as `e31e1ca` with message `Add GeckoTerminal token chart fallback`.
324. Deployed `e31e1ca` to the wallet production release, preserving server backup `/root/backups/acorus-geckoterminal-chart-fallback_20260521_001558`, then rebuilt/recreated the wallet API and web services.
325. Production wallet-only smoke passed: ETH, ZEC, and Venice Token detail APIs returned `200`; ETH included market cap, volume, launch date, categories, logo, links, and multi-platform explorer choices; ZEC included live/safe detail metadata; Venice Token included live price/market stats and Base metadata.
326. Production Venice Token chart smoke passed with `coinId=venice-token&currency=USD`: `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL` all returned chart points.
327. Production dApps smoke passed: `/dapps` returns the clickable user-facing directory with categorized apps and “Open and connect” affordances.
328. Did not execute a real swap or import a mnemonic into a browser profile automatically during this final smoke; those remain manual guarded checks to avoid exposing seed material or triggering value-moving transactions without a human confirmation.
329. Started the token metadata and quest integrity stabilization after the user reported blank coin cards, duplicate BTC Blockchain buttons, missing right-side swap surfaces, and Quests counting progress without a wallet.
330. Added CoinPaprika fallback metadata and ticker support to the API provider, with safe mapped ids for BTC, ETH, SOL, TON, ZEC, and HYPE.
331. Added supplemental detail enrichment so successful CoinGecko detail responses with null price/market-cap/volume fields are completed from Binance and CoinPaprika instead of rendering empty token metrics.
332. Updated the token detail route/API client to pass requested symbol/name through unavailable states, and updated token pages to dedupe explorer links into a single Blockchain dropdown while keeping non-explorer links separate.
333. Added clearer explorer labels for Mempool, TONViewer, Zcash Explorer, Blockchair, Hypurrscan, and Nearblocks.
334. Replaced manual Quests completion with wallet-gated event detection: without a real wallet, quest progress remains 0/10 and opening pages alone no longer grants XP.
335. Added regression coverage for CoinPaprika arbitrary fallback and supplemental market-field enrichment when CoinGecko detail returns null numeric fields.
336. Local validation passed for this stabilization: `pnpm --filter @acorus/api test`, `pnpm --filter @acorus/api build`, `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `git diff --check`, `pnpm test`, `pnpm build`, and `pnpm extension:package`.
337. Local live provider smoke confirmed BTC, ETH, SOL, ZEC, HYPE, Venice Token, and TON return real or supplemental market metadata; TON now returns real price, market cap, 24h volume, high/low, and multi-platform data when CoinGecko detail fields are null.
338. Committed and pushed the token metadata/quest stabilization as `2be8cae` with message `Stabilize token metadata and quest progress`.
339. Deployed `2be8cae` to the wallet production release, preserving server backup `/root/backups/acorus-token-metadata-quests_20260521_141700`, then rebuilt/recreated the wallet API, web, and nginx services.
340. Production API smoke confirmed BTC, TON, and HYPE token detail endpoints return real price, market cap, 24h volume, link, and platform metadata instead of empty/mock cards.
341. Browser smoke confirmed BTC, SOL, and ZEC token pages render a right-side swap shell without a connected wallet, non-empty market metrics where providers expose them, and one deduped visible Blockchain action.
342. Browser smoke confirmed `/quests` shows `0/10 quests complete`, `Total XP: 0`, and no manual Complete buttons when no real wallet is active.
343. Committed and pushed the native family-label fix as `18e05c3` with message `Fix native token family labels`, preventing assets such as ZEC from showing a wrapped platform label in the header.
344. Deployed `18e05c3` to production, preserving server backup `/root/backups/acorus-native-labels_20260521_142915`, then rebuilt/recreated the wallet web service and nginx.
345. Final browser smoke confirmed the deployed ZEC page now shows `Zcash / ZEC / Zcash`, BTC has one Blockchain action, and Quests remain wallet-gated at `0/10` with no self-completion path.
346. Started the Jupiter/Rango swap foundation wave after the user provided a Jupiter provider key and requested 0x, Jupiter, and Rango as the main swap routes. The key was not written to the repository or echoed into docs.
347. Added shared swap provider/status/quote/draft types for `0x`, `jupiter`, and `rango`.
348. Added backend Jupiter proxy routes for Solana quote and transaction-draft calls with env-only API key handling, validation, rate limiting, 8 second timeout, and safe response mapping.
349. Added backend Rango proxy routes for cross-chain quote and transaction-draft calls with env-only API key handling, validation, rate limiting, 8 second timeout, and safe response mapping.
350. Added `/api/swap/status` so the web app and extension can see 0x/Jupiter/Rango provider configuration without exposing provider secrets.
351. Updated the swap composer so 0x, Jupiter, and Rango appear as explicit provider cards; Jupiter and Rango now support backend quote/draft requests while execution remains gated for the next approval wave.
352. Reworked `/create` into an extension-first create flow with readable controls, extension detection, and a collapsed legacy local web-vault fallback.
353. Cleaned token detail visual noise by removing repeated live/source badges and keeping price/swap layout more stable.
354. Polished extension popup token rows with logo support and user-facing chain/balance metadata instead of internal source strings.
355. Validation passed for this wave: shared build, wallet-core build, API test/build, extension lint/test/build, web test/build, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
356. Local smoke confirmed `/api/swap/status` reports 0x/Jupiter/Rango without leaking keys, `/create` renders the extension-first flow, and the Bitcoin token page hydrates live metadata with one Blockchain action and a visible right-side swap panel.
357. During production rollout prep, found that `infra/docker-compose.yml` did not yet pass `JUPITER_*` and `RANGO_*` env values into the API container; added explicit backend-only env pass-through.
358. The VPS web rebuild hit Docker Hub unauthenticated pull limits for `node:24-alpine`, so the web Dockerfile now uses `node:24-bookworm-slim`, matching the cached API base family.
359. Production Docker build then exposed a stale generated `.chrome-extension-profile` directory in the release folder; added it to `.dockerignore` so Chrome profile/model files cannot enter future Docker build contexts.
360. Browser smoke on production `/swap` showed the page still hid the swap shell without an active wallet; updated `/swap` so quotes/provider UI remain visible without a wallet while execution stays gated behind extension approval.
361. Deployed the final swap-provider wave to `/opt/acorus-wallet-release-current`, preserving backups `/root/backups/acorus-swap-providers-deploy_20260521_200709`, `/root/backups/acorus-docker-context-fix_20260521_202739`, and `/root/backups/acorus-swap-visible-deploy_20260521_205555`.
362. Removed stale generated `.chrome-extension-profile` directories from production backups/release to free disk space and prevent Docker build context bloat.
363. Production rebuild/recreate passed for API and web; `https://24wallet.ru/api/swap/status` now reports 0x configured, Jupiter configured, and Rango present but not configured because no Rango key is set.
364. Production Jupiter read-only quote smoke passed for SOL -> USDC through the backend proxy without exposing the key.
365. Production browser smoke passed for `/swap`: the page now shows the `0x · Jupiter · Rango` swap shell, Jupiter route fields, and Rango route fields even with no active wallet.
366. Continued the extension/runtime stabilization after the user reported failed seed import, `Buffer is not defined` during create wallet, a stale initial demo sign-message prompt, unreadable light-theme cards, and Rango not being configured in production.
367. Configured the Rango provider key in the VPS release environment only, preserving env backup `/root/backups/acorus-rango-env_20260521_220917`; no provider key was written to the repository or docs.
368. Restarted the production API with `docker compose --env-file .env` after confirming the compose file needs the env file for interpolation, and production `/api/swap/status` now reports 0x, Jupiter, and Rango as configured.
369. Replaced Node `Buffer` usage in wallet-core base64 helpers with browser-safe `btoa`/`atob` loops so extension wallet creation no longer depends on Node globals.
370. Hardened extension seed import normalization to tolerate pasted quotes, punctuation, and numbered word lists while still validating only BIP-39 mnemonic words.
371. Removed auto-seeded demo dApp sessions/requests from extension state, added pruning for old demo preview entries, and added a connectionless approval path for `wallet_addEthereumChain` and `wallet_watchAsset` so sites can request add-network/add-token prompts without exposing accounts first.
372. Added regression tests for empty dApp shell state, demo preview pruning, and quoted mnemonic import; extension stabilization tests now cover add-chain/watch-asset approval queues without a preconnected demo session.
373. Improved web light-theme readability by overriding remaining dark slate cards/text in wallet pages and fixing receive/wallet QR colors for the white/purple palette.
374. Validation passed for the stabilization so far: shared build, wallet-core build, API test/build, web test/build, extension lint/test/build/test, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
375. Removed hardcoded VPS credentials from legacy deploy/verify scripts; they now read `ACORUS_VPS_PASSWORD` or prompt interactively. A repository scan for the supplied seed phrase, provider keys, and VPS password returned no remaining plaintext matches in tracked source paths.
376. Started the universal swap extension review foundation after the 0x/Jupiter/Rango backend provider wave, keeping live transaction execution limited to the already-reviewed 0x EVM path.
377. Added shared `universal_swap` dApp review details for Jupiter and Rango so approval cards can show sanitized provider, network, route, amount, slippage, expiration, and review-only status data.
378. Added extension protocol support for `queue_universal_swap_approval` and widened extension activity records to track `0x`, `jupiter`, and `rango` providers.
379. Updated the extension background so Jupiter/Rango `acorus_swap` approvals are queued, reviewed, and resolved as preview results only; no Solana or Rango transaction is signed or broadcast in this wave.
380. Added popup approval card rendering for universal swaps and regression coverage to ensure raw transaction blobs/calldata/route JSON are not rendered in the UI.
381. Updated the web swap composer so loaded Jupiter and Rango backend routes can be sent to the extension for review, with clear copy that execution remains gated.
382. Rebuilt the public extension zip after the popup/background/protocol changes.
383. Validation passed for the universal review wave: shared build, wallet-core build/test, API test/build, extension lint/test/build, web test/build, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
384. Started the Acorus premium design-system wave after reviewing the current home, swap composer, Explore, token detail, and extension popup surfaces.
385. Added unified white/purple CSS tokens, premium card/button/pill/status/metric primitives, skeleton shimmer styles, and removed remaining decorative dark/orb surfaces from the default app shell.
386. Added `/design-system` as a local visual smoke route with buttons, network pills, metric cards, approval mock, token rows, banners, and skeleton examples.
387. Reworked the home page into a wallet/trading shell with capability pills, a reusable `SwapComposer`, market preview rows, product action cards, and security/service status sections.
388. Added a shared swap CTA helper and tests so swap action labels remain consistent across provider-missing, disconnected, loading, stale, approval-required, wrong-chain, and review-ready states.
389. Polished Explore loading and row data density with skeleton rows and 24h volume cells while preserving existing tabs and pagination.
390. Refined token detail actions with copy-address and trade CTA controls, cleaner unavailable states, and lighter white/purple interaction styling.
391. Lightened the extension popup shell and wallet-card styling to match the web palette while leaving approval, dApp, send, receive, and swap review behavior intact.
392. Added design-system and product-parity docs, updated README/roadmap, and recorded the wave in project memory.
393. Validation passed for the design-system wave: shared build, wallet-core build/test, API test/build, extension lint/test/build, web test/build, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
394. Local browser smoke passed for `/design-system`, `/`, `/explore`, and an ETH token detail route; local token detail API hydration showed the expected missing local API proxy limitation, while production will use the deployed API path.
395. Started the Magic Glass redesign and wallet-lock repair wave after the user reported an unlock/passcode screen despite not setting a passcode.
396. Audited web storage/bootstrap/wallet routes and found that `/wallet` used `activeProfile.type === "local" && !unlockedVault` as the lock condition, which misclassified stale local profiles without a real encrypted vault as locked wallets.
397. Added wallet vault UI state resolution, vault metadata persistence, local wallet reset helper, and regression tests for empty, stale, missing marker, locked, and unlocked states.
398. Reworked `/unlock` into onboarding, valid unlock, already-unlocked, and repair/reset flows with Magic Glass styling and a `RESET` confirmation path.
399. Reworked `/wallet` stale local-profile handling so it shows repair/reset instead of an unlock CTA when no encrypted vault exists.
400. Added the Magic Glass design layer, global nav update, Magic Glass home hero, and updated `/design-system` reference page.
401. Focused validation passed: `pnpm --filter @acorus/web test -- wallet-vault-state reset-local-wallet storage design-system-page` and `pnpm --filter @acorus/web build`.
402. Fixed `/unlock?repair=1` so the explicit repair path is not swallowed by the empty onboarding branch.
403. Broader validation passed package-by-package: shared test, wallet-core test, API test, extension lint/test, web test, API/web/extension builds, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
404. Root `pnpm test` was attempted but hung in this Windows desktop session; the equivalent workspace test suites passed individually.
405. Generated local browser smoke screenshots for home desktop, home mobile, unlock/repair, and design-system; added `artifacts/` to `.gitignore` so screenshots stay local.
406. Committed and pushed the wave as `f1bd66f` with message `Fix wallet lock state and add magic glass redesign`.
407. Deployed the wave to `/opt/acorus-wallet-release-current`, preserving backup `/root/backups/acorus-magic-glass-lock-fix_20260523_004344`, then rebuilt/recreated wallet API, web, and nginx services.
408. Production smoke passed for `/health`, `/wallet`, `/unlock?repair=1`, `/design-system`, `/extension-smoke`, `/downloads/acorus-wallet-extension.zip`, and `/api/swap/status`; browser smoke passed for production `/unlock?repair=1` and `/`.
409. Started a follow-up professional design repair after the user reported production `/wallet` showing a generic page-load failure and asked for a more compact magic/cyber glass style with a distinct Acorus character.
410. Fixed the `/wallet` runtime crash risk by moving token asset selection hooks above all conditional returns, preserving React hook order for empty, repair, locked, and active wallet states.
411. Added the reusable `AcorusMage` character component with local SVG/CSS layers, orbiting asset chips, and no external or copied brand assets.
412. Reworked the home hero into a compact Acorus Guardian stage with left portfolio/swap panels, central character, and right market panels, while hiding low-level Jupiter/Rango forms in compact swap mode.
413. Added a stronger Magic Glass CSS pass for page sizing, global nav, readable form fields, wallet pages, compact swap cards, mobile layout, and local screenshot hygiene through `.screens/` gitignore.
414. Hardened app bootstrap so local browser smoke does not show a global wallet-bootstrap error when the API is temporarily unavailable; it now falls back to a local anonymous id without exposing secrets.
415. Local validation passed for this repair: web test/build, shared build, wallet-core build, API test/build, extension lint/test/build, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
416. Local production route smoke returned `200` for `/`, `/wallet`, `/create`, `/swap`, `/explore`, `/dapps`, `/quests`, `/receive`, `/send`, `/settings`, `/security`, `/extension`, `/extension-smoke`, and `/design-system`.
417. Committed and pushed the route/design repair as `9a56afc` with message `Fix wallet route crash and add Acorus guardian design`.
418. Deployed `9a56afc` to `/opt/acorus-wallet-release-current`, preserving server backup `/root/backups/acorus-guardian-design-route-fix_20260523_013147`, then rebuilt/recreated the wallet API and web containers.
419. Production smoke passed for `/health`, `/wallet`, `/create`, `/swap`, `/explore`, `/dapps`, `/quests`, `/receive`, `/design-system`, `/extension-smoke`, and `/api/swap/status`; production screenshots confirmed the Acorus Guardian home scene and a non-crashing wallet empty state.
420. Started a focused swap/send UX repair after the user reported a dead Install Extension button, shifted swap layout, fake Market pulse bars, obsolete Jupiter/Rango raw forms, and unreadable send review cards.
421. Added `apps/web/lib/swap-token-catalog.ts` with network-aware popular EVM tokens, portfolio token inclusion, curated-token merging, and search filtering for the swap token picker.
422. Added `apps/web/lib/market-pulse.ts` to derive a Fear & Greed style score from live Explore 24h token breadth instead of showing decorative static bars.
423. Updated the swap composer so provider-missing users get a working extension zip download link, token selects open a searchable picker, and the primary CTA now routes through connect/switch/quote/approve/review states.
424. Moved the real `/swap` composer above the extension account card and removed the old TokenDiscoveryHero mock from that route.
425. Hid low-level Jupiter/Rango route debug forms from the public swap surface while keeping backend provider plumbing intact for the next reviewed execution wave.
426. Replaced dark unreadable `/send` review blocks with light Magic Glass review boxes and readable status/error text.
427. Replaced the home Market pulse mock bars with a live Fear & Greed market breadth card.
428. Validation passed for the repair: `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `git diff --check`, `pnpm build`, `pnpm extension:package`, and `pnpm test`.
429. Local browser smoke on `127.0.0.1:3010` confirmed the home Guardian scene, Fear & Greed card, `/swap` composer-first layout, working extension zip link, and searchable token picker with popular Ethereum tokens.
430. Local `/send` smoke reached the no-active-wallet guard; the active-wallet send/review card contrast remains covered by source-level repair and production build validation.
431. Committed and pushed the swap/send UX repair as `44150b8` with message `Repair swap token picker and send UX`.
432. Deployed `44150b8` to `/opt/acorus-wallet-release-current`, preserving server backup `/root/backups/acorus-swap-send-ux_20260523_115622`, then rebuilt and recreated the wallet API and web containers.
433. Production checks passed for `https://24wallet.ru`, `/health`, `/api/swap/status`, and `/downloads/acorus-wallet-extension.zip`; swap provider status reports 0x, Jupiter, and Rango configured without exposing keys.
434. Production browser smoke passed for `/`, `/swap`, `/wallet`, `/create`, `/receive`, and `/send`: the Guardian scene shows Fear & Greed, `/swap` opens the network-aware token picker, the old public Jupiter/Rango debug blocks are hidden, and the wallet routes no longer show the browser-level page-load failure.
435. Started a focused swap discovery/chart inspector repair after the user asked to replace confusing `Advancing`/`Declining` copy, add token-specific icons, show Solana popular tokens in the swap picker, support cross-chain route selection, and show price/date/percent while moving over charts.
436. Expanded the swap token catalog with curated EVM logos, Solana/Jupiter popular token entries, and Rango cross-chain assets while preserving portfolio-token merging and search.
437. Updated the swap composer so the primary route selector includes EVM via 0x, Solana via Jupiter, and cross-chain via Rango; Solana and Rango modes now use the same token picker and queue loaded routes for extension review.
438. Replaced home Fear & Greed breadth labels with `Rising 24h` and `Falling 24h`.
439. Added a token chart hover/touch inspector that shows price, full date/time, and percent change from the selected range start.
440. Validation passed so far: `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `pnpm --filter @acorus/extension test`, and `git diff --check`.
441. Added a `TokenChart` component test for mouse inspection and re-ran validation: `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `pnpm --filter @acorus/extension lint`, `pnpm --filter @acorus/extension test`, `pnpm test`, and `git diff --check` all passed.
442. Committed and pushed the swap discovery/chart inspector wave as `685e229` with message `Improve swap discovery and chart inspection`.
443. Deployed `685e229` to `/opt/acorus-wallet-release-current`, preserving server backup `/root/backups/acorus-swap-discovery-chart_20260523_183147`, then rebuilt and recreated the wallet API and web containers.
444. Production checks passed for `https://24wallet.ru`, `/health`, `/api/swap/status`, `/swap`, and `/downloads/acorus-wallet-extension.zip`; provider status reports 0x, Jupiter, and Rango configured without exposing provider keys.
445. Production browser smoke passed for `/swap`: Solana route mode opens the token picker with popular Solana tokens by 24h volume, cross-chain mode exposes Rango-style route assets, and the BTC token chart inspector shows active price, full date/time, and percent change from the selected range start.
446. Started a focused wallet account menu/preferences repair after the user pointed out that the top-right wallet badge was visible but not interactive.
447. Added `apps/web/lib/app-preferences.ts` with normalized theme, display currency, language, Google Translate, analytics, and balance/activity privacy preference helpers.
448. Extended web local settings and the Zustand wallet store so app preferences persist locally without touching seed phrases, private keys, passcodes, or signing payloads.
449. Replaced the static top-right wallet badge with an interactive `WalletAccountMenu` containing copy address, send, receive, portfolio, recent activity, settings, and history actions.
450. Added an embedded account-menu settings view with theme controls, a broad currency list, language selection, a safe Google Translate link, and privacy toggles.
451. Reworked `/settings` to use the same preference model and a clearer wallet-style settings layout, including currency/language and balance/activity privacy controls.
452. Validation passed for the menu/preferences repair: web preference/storage/store focused tests, full web test/build, extension lint/test/build, root `pnpm test`, root `pnpm build`, `git diff --check`, and `pnpm extension:package`.
453. Local browser smoke on `/wallet` confirmed that clicking the top-right wallet badge opens the account menu and that the nested settings view exposes currency, language, Google Translate, analytics, and balance/activity privacy toggles.
454. Committed and pushed the wallet account menu/preferences repair as `a054950` with message `Add wallet account menu and preferences`.
455. Deployed `a054950` to `/opt/acorus-wallet-release-current`, preserving server backup `/root/backups/acorus-wallet-menu-preferences_20260523_231012`, then rebuilt/recreated the web and nginx containers.
456. Production checks passed for `/health`, `/wallet`, `/settings`, and `/downloads/acorus-wallet-extension.zip`; production browser smoke confirmed the account menu and nested settings panel work on `https://24wallet.ru/wallet`.
457. Started an explicit passcode setup repair after the user reported that importing a wallet still led to an unknown auto-created passcode.
458. Added web vault metadata fields for `passcodeMode` and `passcodeSetupConfirmedAt`, and made `saveEncryptedVault` require a passcode mode.
459. Added a reusable passcode policy helper and tests for numeric PINs, random passwords, confirmation mismatch, saved-password acknowledgement, and random generation.
460. Added a web `PasscodeSetupDialog` so create/import asks whether to use a numeric PIN or generated/random password before wallet encryption.
461. Updated web create/import flows to refuse wallet creation/import until explicit passcode setup is confirmed by the user.
462. Updated wallet vault UI state resolution so markerless/stale vault metadata enters repair/reset instead of showing the unlock keypad.
463. Fixed `/unlock` production build by wrapping `useSearchParams` usage in a Suspense boundary and reusing the loading card as the fallback.
464. Added extension vault metadata markers for explicit passcode setup and made markerless legacy metadata invalid for initialized-lock decisions.
465. Added `reset_extension_wallet` runtime support and popup reset controls to clear only extension-local encrypted vault state.
466. Updated extension popup create/import forms with explicit PIN/random password controls, random generation, confirmation validation, and reset messaging.
467. Added `docs/wallet_explicit_passcode_reset_report.md` explaining the root cause, recovery flow, validation, and limitations.
468. Validation passed for this repair so far: `pnpm --filter @acorus/web test`, `pnpm --filter @acorus/web build`, `pnpm --filter @acorus/extension test`, and `pnpm --filter @acorus/extension build`.
469. Continued the passcode/design wave by aligning web import validation with wallet-core importability checks so valid test phrases can be imported without false rejection.
470. Added wallet-core and extension regression tests for the supplied 12-word test seed phrase, including EVM/Solana derivation and extension vault import.
471. Fixed the web swap install-extension CTA so it opens `/extension` instead of behaving like a dead button.
472. Added `AcorusMagicStage` as a reusable Guardian stage with floating token chips and connected it to the existing CSS/SVG Acorus Mage component.
473. Reworked the home page into a compact Magic Glass dashboard with portfolio, swap, Guardian, token discovery, and Fear & Greed panels.
474. Reworked `/swap` so the real swap composer is the primary module and the Guardian stage/extension card are supporting modules.
475. Reworked `/wallet` empty, repair, locked, and active states onto Magic Glass panels and replaced direct reset buttons with the safer `/unlock?repair=1` reset flow.
476. Added Acorus Guardian design/lock-fix docs: plan, report, and character bible.
477. Validation passed so far: wallet-core test, extension test, web test, and web build.
