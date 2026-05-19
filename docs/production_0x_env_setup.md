# Production 0x Environment Setup

Production currently reports `configured=false` on `https://24wallet.ru/api/swap/evm/status`.
No `ZEROX_API_KEY` was found in the current Acorus wallet release env files on VPS.

## Where the API env lives

- Release path: `/opt/acorus-wallet-release-current`
- Compose file: `/opt/acorus-wallet-release-current/infra/docker-compose.yml`
- Release env file: `/opt/acorus-wallet-release-current/.env`

## Required env entry

Add this line to `/opt/acorus-wallet-release-current/.env`:

```env
ZEROX_API_KEY=...
```

Optional companion vars:

```env
ZEROX_API_BASE=https://api.0x.org
ZEROX_API_VERSION=v2
ZEROX_ENABLED=true
ZEROX_AFFILIATE_FEE_BPS=
ZEROX_FEE_RECIPIENT=
ZEROX_RATE_LIMIT_PER_MINUTE=30
```

## Apply safely

1. Edit `/opt/acorus-wallet-release-current/.env`
2. Rebuild only wallet services:

```bash
cd /opt/acorus-wallet-release-current/infra
docker compose up -d --build api web nginx
```

3. Verify:

```bash
curl -s https://24wallet.ru/api/swap/evm/status
curl -s https://24wallet.ru/health
curl -s https://24wallet.ru/api/market/prices
```

## Expected result

- `configured: true`
- no API key in response body
- `/api/swap/evm/0x/price` and `/api/swap/evm/0x/quote` stop returning `503 swap_provider_not_configured`

## Security notes

- Never commit `ZEROX_API_KEY`
- Never print the key in shell logs, docs, dashboards, or error payloads
- Keep the key only in backend env files / secret storage
