# Chrome Extension Multichain Parity Report

## Files Changed

- `apps/extension/src/background/extension-storage.ts`
- `apps/extension/src/background/extension-chain-registry.ts`
- `apps/extension/src/background/extension-assets.ts`
- `apps/extension/src/background/index.ts`
- `apps/extension/src/background/extension-wallet.ts`
- `apps/extension/src/popup/index.ts`
- `apps/extension/static/popup.html`
- `apps/extension/src/shared/protocol.ts`
- `packages/shared/src/chains.ts`
- `packages/wallet-core/src/evm/client.ts`
- `apps/extension/src/background/extension-chain-registry.test.ts`
- `apps/extension/src/background/extension-assets.test.ts`

## Features Implemented

- Added extension storage helpers for typed local storage reads/writes.
- Added an extension network registry with EVM, Solana, Tron, Bitcoin, TON, active chain state, and custom EVM persistence.
- Added RPC `eth_chainId` validation before saving custom EVM networks.
- Added watched assets storage and `wallet_watchAsset` persistence for ERC-20 tokens.
- Added portfolio snapshot builder with native/watched assets and honest status labels.
- Reworked popup home away from hardcoded demo assets toward runtime portfolio snapshots.
- Added popup network selector and active chain switching.
- Added popup receive composer plus safe Buy, Swap, and Send action panels.
- Expanded shared EVM chain metadata and wallet-core viem chain support for Avalanche, Linea, Fantom, Sei, opBNB, and zkSync Era.

## Tests

- `pnpm --filter @acorus/extension test` passed after adding registry/assets tests.
- `pnpm --filter @acorus/shared build` passed.
- `pnpm --filter @acorus/wallet-core build` passed.
- `pnpm --filter @acorus/extension lint` passed.
- `pnpm --filter @acorus/extension build` passed.
- `pnpm test` passed.
- `pnpm build` passed after a rerun; the first attempt hit a transient Turbopack workspace resolution error for `@acorus/shared`, then the web build and full workspace build succeeded immediately afterward.
- `git diff --check` passed.
- `pnpm extension:package` passed and refreshed `apps/web/public/downloads/acorus-wallet-extension.zip`.

## Known Limitations

- Solana, Tron, Bitcoin, and TON balances are intentionally marked unavailable/skeleton until safe live adapters are implemented.
- Non-EVM send/swap execution remains disabled and presented as draft/coming soon.
- Portfolio fiat totals remain null until price data is wired into the extension snapshot.
- Browser visual automation was unavailable in the current Codex browser pane, so visual extension-click verification still needs a manual Chrome reload/check. TypeScript, Vitest, workspace build, and extension package output passed.

## Next Step

Implement real non-EVM balance adapters first, then add reviewed swap execution providers for EVM and quote-only routing for cross-chain/non-EVM flows.
