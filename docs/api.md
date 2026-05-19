# API

## Health

- `GET /health`

## Users

- `POST /api/users/anonymous`

## Wallet profiles

- `POST /api/wallet-profiles`
- `GET /api/wallet-profiles?userId=...`
- `PATCH /api/wallet-profiles/:id`
- `DELETE /api/wallet-profiles/:id?userId=...`

## Contacts

- `POST /api/contacts`
- `GET /api/contacts?userId=...`
- `PATCH /api/contacts/:id`
- `DELETE /api/contacts/:id?userId=...`

## Transactions

- `POST /api/transactions`
- `GET /api/transactions?userId=...&walletProfileId=...`
- `PATCH /api/transactions/:id/status`

## Onboarding progress

- `GET /api/onboarding-progress?userId=...`
- `POST /api/onboarding-progress`

## Metadata

- `GET /api/chains`
- `GET /api/tokens?chainId=...`
- `GET /api/prices?symbols=ETH,BNB,MATIC`

## Swap

- `POST /api/swap/quote`
  - quote-preview only
  - rejects sensitive payload fields such as `mnemonic`, `seed`, `privateKey`, and `passcode`
- `GET /api/swap/evm/status`
  - returns 0x provider configuration status without exposing the API key
- `GET /api/swap/evm/0x/price`
  - backend proxy for 0x AllowanceHolder indicative price
  - query: `chainId`, `sellToken`, `buyToken`, `sellAmount` or `buyAmount`, `taker`, optional `slippageBps`
  - response resolves safer token metadata for native, curated, and custom ERC-20 refs
- `GET /api/swap/evm/0x/quote`
  - backend proxy for 0x AllowanceHolder firm quote
  - returns a safe subset with transaction fields for explicit extension approval
  - includes `createdAt`, `expiresAt`, approval context, and enriched token metadata
- `GET /api/swap/evm/0x/sources`
  - provider metadata placeholder

## Operational smoke

- `node scripts/smoke-zerox-live.mjs`
  - read-only production smoke for `/api/swap/evm/status`, `/price`, and `/quote`
  - requires `ZEROX_API_KEY` to be configured on the active VPS env
  - current production target `https://24wallet.ru` is activated and returns `PASS` for the recorded smoke run on `2026-05-19`
