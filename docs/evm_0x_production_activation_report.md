# EVM 0x Production Activation Report

## Result

Production activation is **prepared but not fully enabled**.
The codebase now supports `ZEROX_*` env pass-through and production-safe 0x hardening, but live 0x quotes on `24wallet.ru` remain blocked because `ZEROX_API_KEY` is still missing on VPS.

## Verified production status

- `GET https://24wallet.ru/api/swap/evm/status`
  - `provider: "0x"`
  - `configured: false`
  - `enabled: true`
- VPS audit found no configured `ZEROX_API_KEY` in:
  - `/opt/acorus-wallet-release-current/.env`
  - `/opt/acorus-wallet/.env`
  - prior Acorus release `.env` files under `/opt`

## Activation work completed

- `infra/docker-compose.yml` now passes:
  - `ZEROX_API_KEY`
  - `ZEROX_API_BASE`
  - `ZEROX_API_VERSION`
  - `ZEROX_ENABLED`
  - `ZEROX_AFFILIATE_FEE_BPS`
  - `ZEROX_FEE_RECIPIENT`
  - `ZEROX_RATE_LIMIT_PER_MINUTE`
- `.env.example` now documents the same 0x env contract
- `docs/production_0x_env_setup.md` added exact VPS setup steps

## Current limitation

Until `ZEROX_API_KEY` is added, live `price` and `quote` are expected to return:

- HTTP `503`
- `swap_provider_not_configured`
