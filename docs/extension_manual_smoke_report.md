# Extension Manual Smoke Report

Date: 2026-05-19

## Automatic Verification

- Local extension tests pass with provider compatibility, approval queue, receive composer, and Solana send queue source guards.
- `/extension-smoke` now includes:
  - provider detection for `window.ethereum`, `window.acorus`, `window.solana`, and `window.tronLink`
  - protocol/origin/secure-context status
  - EVM request buttons for account, chain id, switch chain, add chain, watch asset, and sign message
  - event log for `accountsChanged`, `chainChanged`, `acorusSolana#connect`, and `acorusSolana#disconnect`
  - copy diagnostics and clear log controls
  - Solana diagnostics for connect, public key, sign message, and capability display
  - disabled transaction composer for intentionally manual send testing

## Production Verification

- HTTPS routing for `24wallet.ru` is fixed at nginx.
- HTTP and `www` now redirect to canonical `https://24wallet.ru`.
- HSTS is active without preload.
- The current wallet release is deployed at `/opt/acorus-wallet-release-current`.
- `https://24wallet.ru/extension-smoke` returns `200 OK` and renders the smoke harness.

## Manual Chrome Checklist

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension from `apps/extension/dist`.
4. Open `https://24wallet.ru/extension-smoke` after deployment.
5. Confirm detected providers show `window.ethereum`, `window.acorus`, `window.solana`, and `window.tronLink`.
6. Run `eth_requestAccounts`, approve in popup, and verify returned accounts.
7. Run `wallet_switchEthereumChain` for Polygon/Base/BNB and verify `chainChanged`.
8. Run `wallet_addEthereumChain`, confirm in popup, and verify the custom network is persisted only after approval.
9. Run `wallet_watchAsset`, confirm in popup, and verify the token appears only after approval.
10. Run Solana connect and sign message; verify the popup approval flow and final result.
11. Open popup Receive and switch EVM/Solana/Tron/BTC/TON; verify only matching family addresses are copyable.
12. Open popup Send, select SOL, enter a small test transfer, and verify it queues approval before execution.
13. If the wallet has SPL tokens, select an SPL asset, enter a recipient and amount, and verify the approval card shows token mint, estimated fee, and ATA warning when applicable.
14. Reject one SPL approval and verify the page receives a user-rejected style failure.
15. Approve only a tiny funded test transfer and verify the returned Solana signature in Solscan.

## Known Gaps

- Chrome extension reload and live dApp clicks still need manual browser verification in the user's main Chrome profile.
- Automatic remote browser verification cannot load the user's installed Chrome extension from this shell session.
- WalletConnect relay and swap execution remain intentionally out of scope for this wave.
