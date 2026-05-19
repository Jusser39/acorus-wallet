# EVM 0x Swap API Proxy

The Acorus backend owns the 0x API integration. Browser clients and the Chrome extension call Acorus routes only.

## Routes

- `GET /api/swap/evm/status`
- `GET /api/swap/evm/0x/price`
- `GET /api/swap/evm/0x/quote`
- `GET /api/swap/evm/0x/sources`

## Environment

- `ZEROX_API_KEY`: backend-only 0x API key.
- `ZEROX_API_BASE`: defaults to `https://api.0x.org`.
- `ZEROX_API_VERSION`: defaults to `v2`.
- `ZEROX_ENABLED`: enables or disables provider access.
- `ZEROX_AFFILIATE_FEE_BPS` and `ZEROX_FEE_RECIPIENT`: optional server-side fee settings.

## Security

- The API key is sent only from backend to 0x using `0x-api-key`.
- The response exposes only a safe subset needed for price preview, allowance review, and transaction execution.
- Raw calldata is returned only as the transaction payload required for explicit wallet execution and is not logged by Acorus code.
- Missing key returns `503 swap_provider_not_configured`.
