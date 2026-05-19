# Chrome Extension Parity Stabilization Report

## Implemented

- `wallet_addEthereumChain` now queues an `add_chain` pending request and does not persist before popup approval.
- Rejection of add-chain/watch-asset requests resolves the dApp call with `user_rejected`, which maps to EIP-1193 `4001` in the inpage provider.
- Add-chain approval validates the RPC `eth_chainId` before persistence.
- `wallet_watchAsset` now queues a `watch_asset` pending request and stores the token only after approval.
- Popup pending requests now show actionable add-chain/watch-asset summaries and use `Confirm` for these non-signer requests.
- Receive composer filters addresses by selected family: EVM, Solana, Tron, with BTC/TON shown as coming soon and no unrelated copy action.
- Popup network selector now includes `All networks`; dApp chain switching still requires a concrete configured EVM chain.
- Content script no longer injects `inpage/index.js`; Manifest V3 MAIN-world injection remains the single provider injection path.
- Wallet-core now supports custom viem chains through `createCustomViemChain` and custom client options.
- Extension EVM sign/send preparation can resolve custom saved EVM networks and pass their RPC config to wallet-core clients.
- Custom RPC validation now has an 8-second abort timeout and blocks localhost/private IP RPC URLs outside dev mode.

## Tests Added

- Add-chain queues approval and does not persist before approve.
- Add-chain reject returns `user_rejected`.
- Add-chain approve validates RPC and persists.
- Watch-asset queues approval and does not persist before approve.
- Receive composer source guard for family filtering.
- Content script source guard against duplicate inpage injection.
- Wallet-core custom EVM viem chain config.

## Validation

- `pnpm --filter @acorus/shared build` passed.
- `pnpm --filter @acorus/wallet-core build` passed.
- `pnpm --filter @acorus/extension lint` passed.
- `pnpm --filter @acorus/extension test` passed.
- `pnpm --filter @acorus/extension build` passed.
- `pnpm --filter @acorus/web test` passed after stabilizing the local Vitest worker/jsdom config.
- `pnpm --filter @acorus/web build` passed.
- `pnpm test` passed across shared, wallet-core, api, extension, and web.
- `pnpm build` passed.
- `git diff --check` passed.
- `pnpm extension:package` passed and refreshed `apps/web/public/downloads/acorus-wallet-extension.zip`.

## Known Limitations

- The `All networks` mode is intentionally popup/portfolio-only and is not accepted for dApp session switching.
- BTC and TON receive remain coming soon because the extension vault does not derive those profiles yet.
- Non-EVM send/swap execution remains capability-gated.
- Manual Chrome reload is still needed to visually confirm extension behavior in the installed browser.
