# Architecture

## Overview

Acorus Wallet uses a **TypeScript monorepo** with clear separation between:

- `apps/web` — Next.js App Router PWA shell and wallet UI
- `apps/api` — Fastify API for public wallet data and onboarding metadata
- `packages/wallet-core` — local-only wallet primitives, encryption, EVM helpers
- `packages/shared` — shared DTOs, chain config, token list, practice content

## Wallet flow

1. User creates or imports a mnemonic locally in the browser.
2. Client derives the EVM address.
3. Client encrypts the vault with PBKDF2 + AES-GCM.
4. Only encrypted vault is stored locally.
5. Backend receives only public wallet profile metadata.
6. Unlock decrypts the vault in memory only.
7. Send flow signs locally and broadcasts via RPC.

## Transaction flow

1. Web estimates gas through `wallet-core`.
2. Web performs final confirmation.
3. If unlocked and safety mode allows it, web signs and sends.
4. Backend stores a public transaction record.
5. History page refreshes transaction status by chain ID + hash.

## Backend responsibilities

- Anonymous user creation
- Wallet profiles
- Contacts
- Transaction records
- Curated token metadata endpoint
- Chain config endpoint
- Price endpoint placeholder

## Future mobile architecture

- Reuse `packages/shared`
- Reuse wallet primitives from `packages/wallet-core`
- Replace web local storage with mobile secure storage integration
- Add biometric unlock on top of encrypted vault
- Add WalletConnect / Solana / Tron adapters as separate modules
