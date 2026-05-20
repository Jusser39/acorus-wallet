# Multichain Extension UX + Portfolio Pricing + Manual Smoke Harness Report

## Implemented

- Added popup account selector panel for EVM, Solana, Tron, BTC coming soon, and TON coming soon.
- Kept active profile selection independent from active network selection by reusing the existing profile selection runtime message.
- Updated popup header to show selected account context, selected network or All networks, and lock/unlock status.
- Reworked network selector into grouped All/EVM/Solana/Tron/Coming soon sections with search filtering and capability badges.
- Receive composer now updates the rendered address family immediately when the select changes, without reloading the popup.
- Add-chain and watch-asset approvals now carry structured `reviewDetails` and render dedicated cards instead of raw JSON or a generic summary.
- Add-chain approval card shows network name, decimal/hex chain id, RPC hostname, explorer hostname, native symbol, and risk labels.
- Watch-asset approval card shows token symbol, address, decimals, chain, and a Token not verified risk label.
- Extension portfolio snapshot now enriches native/watched assets with public prices from `/api/market/prices` using `http://24wallet.ru` and `http://85.239.59.199:8080` fallback bases.
- Price failures are popup-safe: assets keep `—`, `price_unavailable` source labels, and warnings instead of breaking rendering.
- Added `/extension-smoke` manual harness for provider detection and dApp method checks.

## Routing Finding

- `24wallet.ru` DNS points to `85.239.59.199`.
- `http://24wallet.ru` and `http://www.24wallet.ru` return the Acorus wallet app.
- `https://24wallet.ru` and `https://www.24wallet.ru` redirect to `/login?next=%2F`, so the HTTPS nginx server block is still routed to the wrong app.
- Fix should be applied on the server TLS vhost: `server_name 24wallet.ru www.24wallet.ru` for port `443` must proxy to the same wallet upstream as HTTP/port `8080`.

## Tests Added

- Popup source guards for network search/filter wiring.
- Popup source guards for receive composer live family/address changes.
- Popup source guards for add-chain/watch-asset approval card renderers without raw JSON.
- Extension price enrichment tests for live prices and API failure fallback.
- Web render test for `/extension-smoke` without an injected provider.

## Validation

- `pnpm --filter @acorus/shared build` passed.
- `pnpm --filter @acorus/wallet-core build` passed.
- `pnpm --filter @acorus/extension lint` passed.
- `pnpm --filter @acorus/extension test` passed.
- `pnpm --filter @acorus/extension build` passed.
- `pnpm --filter @acorus/web test` passed.
- `pnpm --filter @acorus/web build` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `git diff --check` passed.
- `pnpm extension:package` passed and refreshed `apps/web/public/downloads/acorus-wallet-extension.zip`.

## Known Limitations

- BTC and TON account rows remain coming soon because profiles are not derived yet.
- Non-EVM send/swap execution remains disabled by capability.
- Price enrichment depends on the public API being reachable from the extension background service worker.
- HTTPS for `24wallet.ru` still needs server nginx/SSL vhost correction outside this repository change.
