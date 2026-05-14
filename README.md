# Acorus Wallet

Acorus Wallet is a **non-custodial wallet MVP** built as a TypeScript monorepo for web/PWA first, with an architecture that can later move to mobile apps. The current wave focuses on a safe foundation: **local encrypted vault, client-side signing, EVM MVP flows, practice wallet, and a public-data-only backend**.

## What is in the MVP

- Next.js App Router web/PWA shell
- Fastify API for anonymous users, wallet profiles, contacts, transaction records, chains, tokens, and price stubs
- `packages/wallet-core` with mnemonic generation/validation, local PBKDF2 + AES-GCM vault encryption, EVM address derivation, balance/send/status helpers
- `packages/shared` with chain config, curated token list, shared DTOs, practice lessons
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

Prisma schema and store scaffolding are included, but the API currently defaults to `MemoryStore` unless `ACORUS_ENABLE_PRISMA_STORE=true`. This keeps the MVP runnable while Prisma generation/migration is finished for the target environment.

## Important constraints

- This is **not** a custodial wallet
- No backend seed backup
- No Solana/Tron runtime implementation yet
- No WalletConnect, NFT send/burn, real swap, dApp browser, or cross-chain swap yet

## Docs

- `docs/architecture.md`
- `docs/security_model.md`
- `docs/roadmap.md`
- `docs/api.md`
- `docs/project_memory.md`
- `docs/action_memory.md`
