# Solana SPL Transfer Foundation Report

## Implemented

- Added `packages/wallet-core/src/solana/spl-transfer.ts`.
- Exported SPL helpers from wallet-core:
  - `validateSplTokenMint`
  - `validateSolanaOwnerAddress`
  - `getAssociatedTokenAddress`
  - `checkAssociatedTokenAccountExists`
  - `buildSplTransferDraft`
  - `estimateSplTransferFee`
  - `executeSplTransfer`
- Extended extension Solana send execution to route SPL payloads through `executeSplTransfer`.
- Extended `queue_solana_send` with asset metadata:
  - `assetType`
  - `tokenAddress`
  - `symbol`
  - `decimals`
  - `balanceRaw`
- Popup send composer now lists SOL and discovered Solana SPL assets.
- Popup approval card now shows network, asset type, mint, from/to, amount, estimated fee, and ATA warning.
- Solana injected provider now exposes explicit capabilities and supported methods without claiming Phantom compatibility.

## API Base Hardening

- Extension price API base now starts with `https://24wallet.ru`.
- `http://24wallet.ru` is no longer production priority.
- `http://85.239.59.199:8080` remains only as a later development fallback.

## Smoke Harness

- `/extension-smoke` now shows:
  - provider detection
  - current origin/protocol/secure-context status
  - Ethereum `accountsChanged` and `chainChanged` event log
  - Solana connect/disconnect event log
  - copy diagnostics button
  - clear log button
  - Solana capability display

## Tests

- Wallet-core SPL transfer draft tests added.
- Extension pricing base and no-secret public request checks added.
- Popup send composer and approval card source checks updated for SPL.
- Smoke harness render test updated for diagnostics controls.

## Known Limitations

- SPL execution is implemented, but real-world token send still requires manual Chrome verification with a funded Solana wallet and selected SPL token.
- Recipient ATA creation is supported during execution, but sender ATA must already exist.
- Tron, BTC, and TON send execution remain gated.
- Swap execution remains out of scope.
