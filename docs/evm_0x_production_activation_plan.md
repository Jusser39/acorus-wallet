# EVM 0x Production Activation Plan

## Goal

Take the existing 0x EVM swap MVP from backend-safe prototype to production-ready activation without exposing `ZEROX_API_KEY`, without backend signing, and without fake swap success states.

## What this wave enables

- `ZEROX_*` env pass-through in Docker Compose
- documented VPS env setup for `ZEROX_API_KEY`
- decimal-safe EVM amount parsing/formatting
- safer token metadata for native, curated, and custom ERC-20 routes
- richer approval review details
- stronger extension-side quote freshness and anti-tamper checks
- local swap activity history in web and extension
- richer `/extension-smoke` 0x diagnostics

## What remains out of scope

- Solana/Jupiter swap
- Tron/BTC/TON swap
- cross-chain routes
- WalletConnect execution
- automatic real-money execution

## Production boundary

- backend proxies quotes only
- extension signs and broadcasts only after explicit user approval
- `ZEROX_API_KEY` stays server-side only
- seed phrase / private key / passcode never leave the client boundary

## Current production blocker

`https://24wallet.ru/api/swap/evm/status` currently returns `configured: false`.
Production activation remains blocked until a real `ZEROX_API_KEY` is added to `/opt/acorus-wallet-release-current/.env`.
