# Architecture

## Overview

Acorus Wallet uses a **TypeScript monorepo** with clear separation between:

- `apps/web` — Next.js App Router PWA shell and wallet UI
- `apps/api` — Fastify API for public wallet data and onboarding metadata
- `packages/wallet-core` — local-only wallet primitives, encryption, adapter registry, multichain send foundations
- `packages/shared` — shared DTOs, chain config, token list, practice content

## Wallet flow

1. User creates or imports a mnemonic locally in the browser.
2. Client derives one or more chain-family accounts through the adapter registry.
3. Client encrypts the vault with PBKDF2 + AES-GCM.
4. Only encrypted vault is stored locally.
5. Backend receives only public wallet profile metadata.
6. Unlock decrypts the vault in memory only.
7. Universal actions (`receive`, `send`, future `swap`, future `dapp sign`) resolve through family adapters.
8. Any supported signing/broadcast remains client-side only.

## Transaction flow

1. Web creates a universal draft for the selected `Network → Asset → Action`.
2. The relevant chain adapter validates address, amount, asset semantics, and capability gates.
3. Web performs final confirmation.
4. If unlocked and adapter broadcast is enabled, web signs and sends client-side.
5. Backend stores only a public transaction record.
6. History/status refresh resolves by chain family + chain ID + tx hash.

## Backend responsibilities

- Anonymous user creation
- Wallet profiles
- Contacts
- Transaction records
- Curated token metadata endpoint
- Chain config endpoint
- Price endpoint placeholder
- Public transaction/status metadata only

## Universal adapter model

Every chain family is integrated through a shared adapter contract rather than through a separate product fork.

Current live/foundation capabilities:

- Address validation
- Account derivation
- Native balance
- Token balances
- Receive info
- Explorer URLs
- Send draft
- Send broadcast
- History/status
- Swap capability placeholder

Target capabilities for the next expansion waves:

- Swap quote/execution contracts
- Dapp session/signing contracts
- Capability metadata that lets the UI stay universal while honestly gating unsupported flows

## Future mobile architecture

- Reuse `packages/shared`
- Reuse wallet primitives from `packages/wallet-core`
- Replace web local storage with mobile secure storage integration
- Add biometric unlock on top of encrypted vault
- Keep chain integrations adapter-first so mobile can reuse the same universal contracts across EVM, Solana, Tron, UTXO/BTC, TON, and future families
