# EVM 0x Swap Manual Smoke

## Current status

- Backend live activation is complete on `https://24wallet.ru`
- `GET /api/swap/evm/status` currently returns `configured: true`
- `node scripts/smoke-zerox-live.mjs` currently reports `PASS`
- browser/manual extension smoke is still a human step
- tiny real swap was **not** executed in this wave

## Backend

1. Open `https://24wallet.ru/api/swap/evm/status`.
2. Confirm the response has `provider: "0x"` and does not expose any API key.
3. Confirm `configured` is `true` before browser/manual steps.
4. Test a small price request with public token addresses and a test taker address.
5. Test a firm quote and confirm it returns `createdAt`, `expiresAt`, and token metadata with decimals/symbols instead of generic `ERC20`.
6. Run `node scripts/smoke-zerox-live.mjs` and confirm it reports `PASS`.

## Web

1. Open `https://24wallet.ru/swap`.
2. Confirm the page shows the 0x EVM swap composer.
3. Connect the Acorus extension.
4. Select an EVM network and token pair.
5. Enter a formatted token amount and request a quote.
6. Confirm Solana/Jupiter, Tron, Bitcoin, TON, and cross-chain swaps are shown as later-wave scope, not fake execution.
7. If approval is required, verify exact approval is default and infinite approval is optional.
8. Verify quote countdown and wrong-chain state before clicking Review.

## Extension

1. Reload the unpacked extension from `apps/extension/dist`.
2. Unlock or import a test wallet.
3. Open popup, choose Swap.
4. Fetch a quote through the backend.
5. If token approval is required, click Approve token and verify the popup approval card shows token, spender, formatted amount, allowance context, mode, and risk labels.
6. Reject one approval and confirm the site receives a rejection.
7. Queue a swap and verify the approval card shows provider, route, formatted sell/buy amounts, min received, contract, expiry, and risk labels.
8. Only execute a tiny intentional test swap with funds you can lose after explicit human confirmation.

## Smoke Harness

1. Open `https://24wallet.ru/extension-smoke`.
2. Verify provider detection.
3. Run swap status.
4. Enter sell token, buy token, taker, and amount, then test price and quote.
5. Confirm diagnostics can be copied and no API key appears in the output.
6. Confirm diagnostics include last chain id and last error code only, without secrets.
