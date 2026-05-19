# EVM 0x Live Quote Smoke Report

## Status

`blocked_until_ZEROX_API_KEY`

## Current production result

- `GET https://24wallet.ru/api/swap/evm/status`
  - `provider: "0x"`
  - `configured: false`
  - `enabled: true`
- Because `ZEROX_API_KEY` is not configured on VPS, live `price` and `quote` smoke should currently return:
  - HTTP `503`
  - `swap_provider_not_configured`

## VPS audit result

- Inspected release path: `/opt/acorus-wallet-release-current`
- Inspected env candidates under:
  - `/opt/acorus-wallet-release-current/.env`
  - `/opt/acorus-wallet/.env`
  - prior release `.env` files
- No configured `ZEROX_API_KEY` entry was found

## Ready once key is added

The codebase is being hardened so that once `ZEROX_API_KEY` is present the following read-only smoke can run immediately:

1. ETH -> USDC `price`
2. ETH -> USDC `quote`
3. USDC -> ETH approval-needed `quote`
4. `/extension-smoke` 0x diagnostics

## Next action

Set `ZEROX_API_KEY` in production env as described in `docs/production_0x_env_setup.md`, redeploy wallet services, then rerun live smoke.
