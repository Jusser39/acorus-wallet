# Multichain Extension UX + Portfolio Pricing + Manual Smoke Harness Plan

## Goal

Stabilize the Acorus extension as a real multichain wallet UX surface before adding swap execution.

## Scope

- Add a separate account selector for EVM, Solana, Tron, and coming-soon BTC/TON profiles.
- Keep active account/profile independent from the active network selector.
- Improve the network selector with search, family groups, and capability badges.
- Keep receive address rendering family-safe without reloads.
- Replace generic add-chain/watch-asset summaries with structured approval cards.
- Enrich extension portfolio snapshots with public market prices from `/api/market/prices`.
- Add `/extension-smoke` as a manual browser harness for injected provider testing.

## Security Boundary

- No mnemonic, private key, passcode, decrypted vault, raw signature payload, or signing material is sent to backend, content script, or web pages.
- Price requests include only public chain id, symbol, and token address metadata.
- Add-chain/watch-asset review details are sanitized UI metadata, not raw dApp JSON.

## Non-Scope

- Swap execution.
- Non-EVM send execution.
- BTC/TON profile derivation.
- WalletConnect relay execution.

## Validation Checklist

- Package-specific build/test/lint checks.
- Full workspace test/build checks.
- Extension package refresh.
- Manual Chrome smoke testing with `/extension-smoke`.
