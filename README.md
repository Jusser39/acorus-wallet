# Acorus Wallet

Acorus Wallet is a **non-custodial universal multichain wallet + dapp shell** built as a TypeScript monorepo for web/PWA first, with an architecture that can later move to mobile apps. The current product direction is **adapter-first and universal-first**: one wallet runtime for many chain families, with local encrypted vaults, client-side signing, shared send/swap/dapp contracts, and a public-data-only backend.

## What is in the MVP

- Next.js App Router web/PWA shell
- Fastify API for anonymous users, wallet profiles, contacts, transaction records, chains, tokens, market data, and backend-proxied 0x EVM swap quotes
- `apps/extension` Manifest V3 extension shell with live dApp bridge, session registry, permission queue, extension-side EVM sign/send execution, and Solana SOL/SPL send execution behind explicit signer confirmation
- `packages/wallet-core` with mnemonic generation/validation, local PBKDF2 + AES-GCM vault encryption, adapter registry, universal send draft/execution foundation, EVM live send helpers, Solana balance/SPL/native-send foundations, SPL transfer draft/execution helpers, and skeleton Tron/UTXO adapters
- `packages/shared` with chain config, curated token list, shared DTOs, multichain asset/send/swap/dapp types, practice content
- EVM 0x swap MVP with backend-only API key handling, decimal-safe token amount parsing, explicit ERC-20 approval review, local swap activity history, and extension-gated execution; non-EVM/cross-chain swaps remain gated
- Wallet dashboard action grid plus Explore token pages with clickable market radar cards, hoverable charts, token metrics, and embedded EVM 0x swap panels
- Practice wallet mode with fake balances and fake transactions
- View-only wallet flow
- Contacts, history, settings, receive QR, send review flow, autolock, safety mode

## Security model

- Seed phrase, private key, passcode, raw signing payloads **must never reach the backend**
- Sensitive signing/decryption happens **only in the browser**
- Backend stores only public data and user preferences
- Local storage contains only the encrypted vault, public identifiers, and non-sensitive UI settings
- Logger redaction is configured for mnemonic, seed, privateKey, passcode, password, signature, rawTransaction, encryptedVault, and backend swap provider secrets
- `ZEROX_API_KEY` is backend-only and should be configured through `.env` / VPS secrets; see `docs/production_0x_env_setup.md`

## Quick start

### Local development

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install
pnpm --filter @acorus/shared build
pnpm --filter @acorus/wallet-core build
pnpm --filter @acorus/api build
pnpm --filter @acorus/web build
pnpm --filter @acorus/api dev
pnpm --filter @acorus/web dev
```

Copy `.env.example` to `.env` and update RPC endpoints if needed.

### Docker Compose

```bash
docker compose --env-file .env -f infra/docker-compose.yml up --build -d
```

This brings up:

- Postgres
- Redis (optional placeholder)
- Nginx entrypoint on `http://localhost:8080` by default
- API through `http://localhost:8080/api/*` and `http://localhost:8080/health`
- Web through `http://localhost:8080`

For Docker deployment, the web app defaults to **same-origin API calls** and expects Nginx to proxy `/api/*` to the API container. `NEXT_PUBLIC_*` values are injected into the Next.js build through Docker build args, so copy `.env.example` to `.env` before building if you want to override RPC URLs or safety defaults.

## Tests

```bash
pnpm test
```

Read-only live 0x production verification is available through:

```bash
node scripts/smoke-zerox-live.mjs
```

Production `24wallet.ru` is now activated for read-only 0x status/price/quote smoke with `configured:true`; real swap execution still requires explicit extension confirmation and was not auto-executed in this wave.

## Notes about Prisma

Prisma/PostgreSQL persistence is controlled by `ACORUS_ENABLE_PRISMA_STORE=true`.

- `MemoryStore` stays available as a local fallback mode
- Docker API entrypoint waits for PostgreSQL, runs `prisma generate`, then `prisma db push`
- `DATABASE_URL` and `POSTGRES_PASSWORD` belong only in `.env` or VPS secrets, never in committed docs

## Important constraints

- This is **not** a custodial wallet
- No backend seed backup
- Real broadcast is currently live for EVM and Solana SOL/SPL through explicit extension confirmation; Tron, Bitcoin/UTXO, and TON execution remain capability-gated until their send implementations are safety-reviewed
- Solana foundation exists for derivation/balances/SPL discovery/receive/native send/SPL transfer, while Tron and Bitcoin/UTXO remain honest skeleton adapters
- No WalletConnect, NFT send/burn, Solana/Jupiter swap, Tron/BTC/TON swap, or cross-chain swap execution yet
- Universal dApp bridge now includes `window.ethereum` compatibility in the extension for common EVM wallet methods, and approved EVM sign/transaction requests can execute inside the extension after an explicit signer-confirmation step; WalletConnect relay, WalletConnect execution, and broader non-EVM provider execution still remain disabled

## Docs

- `docs/architecture.md`
- `docs/adapter_expansion_roadmap.md`
- `docs/wallet_competitor_benchmark.md`
- `docs/chrome_extension_roadmap.md`
- `docs/chrome_extension_architecture_skeleton_plan.md`
- `docs/chrome_extension_architecture_skeleton_report.md`
- `docs/product_ux_upgrade_plan.md`
- `docs/security_model.md`
- `docs/universal_swap_shell_plan.md`
- `docs/universal_swap_quote_engine_plan.md`
- `docs/universal_swap_quote_engine_report.md`
- `docs/universal_dapp_shell_plan.md`
- `docs/universal_dapp_live_bridge_plan.md`
- `docs/universal_dapp_live_bridge_report.md`
- `docs/universal_dapp_session_permission_shell_plan.md`
- `docs/universal_dapp_session_permission_shell_report.md`
- `docs/production_https_enforcement_report.md`
- `docs/solana_spl_transfer_foundation_plan.md`
- `docs/solana_spl_transfer_foundation_report.md`
- `docs/evm_0x_swap_mvp_plan.md`
- `docs/evm_0x_swap_mvp_report.md`
- `docs/evm_0x_swap_production_hardening_plan.md`
- `docs/evm_0x_production_activation_plan.md`
- `docs/evm_0x_production_activation_report.md`
- `docs/evm_0x_swap_security_model.md`
- `docs/evm_0x_swap_manual_smoke.md`
- `docs/evm_0x_live_quote_smoke_report.md`
- `docs/evm_0x_tiny_real_swap_checklist.md`
- `docs/evm_swap_allowance_hardening_report.md`
- `docs/evm_swap_history_report.md`
- `docs/production_0x_env_setup.md`
- `docs/security_secret_rotation_report.md`
- `docs/token_detail_explore_swap_plan.md`
- `docs/token_detail_explore_swap_report.md`
- `docs/wallet_product_benchmark_ux_upgrade_report.md`
- `docs/roadmap.md`
- `docs/api.md`
- `docs/project_memory.md`
- `docs/action_memory.md`
