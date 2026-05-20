# EVM 0x Live Quote Smoke Report

## Status

`pass`

## Current production result

- `GET https://24wallet.ru/api/swap/evm/status`
  - `provider: "0x"`
  - `approvalModel: "allowance_holder"`
  - `configured: true`
  - `enabled: true`
- read-only live endpoints now return successful JSON for:
  - native ETH -> USDC `price`
  - native ETH -> USDC `quote`
  - USDC -> WETH approval-needed `quote`

## Smoke coverage

1. `GET /api/swap/evm/status`
2. `GET /api/swap/evm/0x/price`
3. `GET /api/swap/evm/0x/quote` for native sell
4. `GET /api/swap/evm/0x/quote` for approval-needed ERC-20 sell
5. `GET /api/market/prices`
6. `GET /extension-smoke`
7. Non-wallet domain checks are out of scope for this wallet report.
8. `node scripts/smoke-zerox-live.mjs`

## Script result

- `scripts/smoke-zerox-live.mjs` completed with:
  - `status.configured: true`
  - `ETH->USDC price`: liquidity available
  - `ETH->USDC quote`: executable `to` + `data` present
  - `USDC->WETH approval quote`: spender/approval context present
  - final result: `0x live smoke: PASS`

## Root causes fixed before PASS

1. Production `.env` was missing `ZEROX_API_KEY`.
2. 0x AllowanceHolder needed native assets normalized to `0xeeee...`.
3. Empty `ZEROX_AFFILIATE_FEE_BPS=` was being coerced to `0`, which incorrectly emitted `swapFeeBps=0`.

## Safety notes

- smoke is read-only and does not auto-submit swaps
- response bodies were checked for obvious secret leak markers before PASS
- tiny real swap execution was **not** performed
