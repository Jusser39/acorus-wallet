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
