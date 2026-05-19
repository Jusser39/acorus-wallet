# Solana Live Wallet MVP Plan

Date: 2026-05-19

## Goal

Make Solana the first live non-EVM chain in the extension without starting swap execution.

## Scope

- Live SOL balance through Solana RPC.
- Live SPL token balances through parsed token accounts.
- Solana receive with the existing family-filtered address composer.
- Solana send draft validation.
- Solana send execution only from the unlocked extension vault and only after explicit popup approval.
- Minimal Solana provider compatibility for connect, disconnect, public key, and sign message.
- `/extension-smoke` Solana diagnostics.

## Non-Scope

- Jupiter swap execution.
- Cross-chain swaps.
- Staking.
- NFT send/burn.
- Tron/BTC/TON send execution.
- Phantom-complete API compatibility.

## Security Boundary

- Mnemonic/private key/passcode stay inside the extension vault/session.
- Backend price/market calls receive only public asset metadata.
- Solana transaction signing happens client-side in the extension after approval.
- No raw signing payload is sent to the backend.

## Validation Checklist

- wallet-core Solana address, amount, explorer, and draft tests.
- extension approval queue tests/source guards.
- web smoke page render test.
- extension build and package.
- production HTTPS curl checks.
