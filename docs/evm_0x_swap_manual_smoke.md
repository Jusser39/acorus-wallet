# EVM 0x Swap Manual Smoke

## Backend

1. Open `https://24wallet.ru/api/swap/evm/status`.
2. Confirm the response has `provider: "0x"` and does not expose any API key.
3. If `configured` is `false`, set `ZEROX_API_KEY` on the API server before live quote testing.
4. If configured, test a small price request with public token addresses and a test taker address.

## Web

1. Open `https://24wallet.ru/swap`.
2. Confirm the page shows the 0x EVM swap composer.
3. Connect the Acorus extension.
4. Select an EVM network and token pair.
5. Enter a raw amount and request a quote.
6. Confirm Solana/Jupiter, Tron, Bitcoin, TON, and cross-chain swaps are shown as later-wave scope, not fake execution.

## Extension

1. Reload the unpacked extension from `apps/extension/dist`.
2. Unlock or import a test wallet.
3. Open popup, choose Swap.
4. Fetch a quote through the backend.
5. If token approval is required, click Approve token and verify the popup approval card shows token, spender, amount, and risk labels.
6. Reject one approval and confirm the site receives a rejection.
7. Queue a swap and verify the approval card shows provider, route, sell/buy amounts, min received, contract, and risk labels.
8. Only execute a tiny intentional test swap with funds you can lose.

## Smoke Harness

1. Open `https://24wallet.ru/extension-smoke`.
2. Verify provider detection.
3. Run swap status.
4. If configured, enter sell token, buy token, taker, and amount, then test price.
5. Confirm diagnostics can be copied and no API key appears in the output.
