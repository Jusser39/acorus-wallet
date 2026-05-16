# Acorus Wallet

Acorus Wallet is a **non-custodial universal multichain wallet + dapp shell** built as a TypeScript monorepo for web/PWA first, with an architecture that can later move to mobile apps. The current product direction is **adapter-first and universal-first**: one wallet runtime for many chain families, with local encrypted vaults, client-side signing, shared send/swap/dapp contracts, and a public-data-only backend.

## What is in the MVP

- Next.js App Router web/PWA shell
- Fastify API for anonymous users, wallet profiles, contacts, transaction records, chains, tokens, and price stubs
- `apps/extension` Manifest V3 architecture skeleton for future browser-wallet connectivity
- `packages/wallet-core` with mnemonic generation/validation, local PBKDF2 + AES-GCM vault encryption, adapter registry, universal send draft/execution foundation, EVM live send helpers, Solana read-only foundations, and skeleton Tron/UTXO adapters
- `packages/shared` with chain config, curated token list, shared DTOs, multichain asset/send/swap types, practice content
- Universal swap quote shell with quote preview, route preview, warnings, and disabled execution state
- Wallet dashboard action grid plus preview shells for Explore, Security Center, dApps, Chrome Extension, and Quests
- Practice wallet mode with fake balances and fake transactions
- View-only wallet flow
- Contacts, history, settings, receive QR, send review flow, autolock, safety mode

## Security model

- Seed phrase, private key, passcode, raw signing payloads **must never reach the backend**
- Sensitive signing/decryption happens **only in the browser**
- Backend stores only public data and user preferences
- Local storage contains only the encrypted vault, public identifiers, and non-sensitive UI settings
- Logger redaction is configured for mnemonic, seed, privateKey, passcode, password, signature, rawTransaction, and encryptedVault

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

## Notes about Prisma

Prisma/PostgreSQL persistence is controlled by `ACORUS_ENABLE_PRISMA_STORE=true`.

- `MemoryStore` stays available as a local fallback mode
- Docker API entrypoint waits for PostgreSQL, runs `prisma generate`, then `prisma db push`
- `DATABASE_URL` and `POSTGRES_PASSWORD` belong only in `.env` or VPS secrets, never in committed docs

## Important constraints

- This is **not** a custodial wallet
- No backend seed backup
- Real broadcast is currently live only for EVM; non-EVM adapters remain capability-gated until their send implementations are safety-reviewed
- Solana foundation exists for derivation/balances/receive/send-draft, while Tron and Bitcoin/UTXO remain honest skeleton adapters
- No WalletConnect, universal dapp session shell, NFT send/burn, real swap execution, or cross-chain swap execution yet
- Chrome extension architecture skeleton exists in-repo, but no live site connectivity, permissions, signing, or provider compatibility is enabled yet

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
- `docs/wallet_product_benchmark_ux_upgrade_report.md`
- `docs/roadmap.md`
- `docs/api.md`
- `docs/project_memory.md`
- `docs/action_memory.md`
