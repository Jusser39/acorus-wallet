# EVM 0x Swap MVP Report

## Summary

Implemented a safety-gated EVM swap MVP through the Acorus backend and Chrome extension approval queue. 0x API access is backend-only, and swap execution is routed through explicit extension review.

## Implemented

- Added shared 0x EVM swap types for price, quote, approval, and execution drafts.
- Added backend 0x proxy routes:
  - `GET /api/swap/evm/status`
  - `GET /api/swap/evm/0x/price`
  - `GET /api/swap/evm/0x/quote`
  - `GET /api/swap/evm/0x/sources`
- Added backend environment support for `ZEROX_API_KEY`, `ZEROX_API_BASE`, `ZEROX_API_VERSION`, and optional fee configuration.
- Added ERC-20 allowance/approve helpers in wallet-core.
- Added extension runtime messages for token approval and 0x swap approval queueing.
- Added popup EVM swap composer with backend quote fetch, approval-required state, token approval queueing, and swap review queueing.
- Updated `/swap` to use the 0x EVM route with extension execution prompts.
- Added 0x diagnostics to `/extension-smoke`.

## Security

- The 0x API key is never returned by backend routes and is not bundled into web or extension code.
- Backend returns a safe 0x subset instead of exposing the entire provider payload.
- Token approval and swap broadcasts require explicit extension approval.
- Stale swap quotes are blocked before execution.
- Quote taker and selected EVM account must match for popup-originated swaps.

## Production

- Deployed the runtime-equivalent 0x MVP build to `/opt/acorus-wallet-release-current`; documentation was finalized afterward in the same wave.
- Rebuilt the Docker Compose API and web services.
- `ZEROX_API_KEY` is not configured on the VPS yet, so live quote routes correctly return `503 swap_provider_not_configured`.
- Verified:
  - `https://24wallet.ru/api/swap/evm/status`
  - `https://24wallet.ru/api/swap/evm/0x/price?...` missing-key 503
  - `https://24wallet.ru/extension-smoke` contains the EVM 0x diagnostics block
  - `https://24wallet.ru/api/market/prices?...` still works
  - `https://24wallet.ru` returns 200 over HTTPS
  - Non-wallet domain checks are out of scope for this wallet report.

## Validation

- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`

- `pnpm test`
- `pnpm build`
- `git diff --check`
- `pnpm extension:package`

## Known Limitations

- 0x swaps are EVM-only.
- `ZEROX_API_KEY` must be configured on the API server for live quotes.
- Solana/Jupiter swap is not included in this wave.
- Tron, Bitcoin, TON, cross-chain swap, and WalletConnect execution remain disabled.
- Web-initiated swaps require the user to be connected to the Acorus extension first.
