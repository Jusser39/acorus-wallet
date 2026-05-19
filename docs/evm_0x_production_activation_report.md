# EVM 0x Production Activation Report

## Result

Production activation is **enabled and working** on `https://24wallet.ru`.

- `GET /api/swap/evm/status` now returns:
  - `provider: "0x"`
  - `approvalModel: "allowance_holder"`
  - `configured: true`
  - `enabled: true`
- read-only live smoke now passes for:
  - native ETH -> USDC `price`
  - native ETH -> USDC `quote`
  - USDC -> WETH approval-needed `quote`
- tiny real swap execution was **not** performed

## Production changes applied

- `ZEROX_API_KEY` was written to `/opt/acorus-wallet-release-current/.env` without printing the value
- runtime env also keeps:
  - `ZEROX_API_BASE=https://api.0x.org`
  - `ZEROX_API_VERSION=v2`
  - `ZEROX_ENABLED=true`
  - `ZEROX_RATE_LIMIT_PER_MINUTE=30`
- wallet services restarted:
  - `api` + `web` after env activation
  - `api` rebuilt again after final live-fix rollout

## Final live fixes shipped

1. Native token aliases are now sent to 0x as `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` instead of `ETH`.
2. ERC-20 token addresses sent to 0x are normalized to lowercase.
3. Empty optional numeric env values no longer coerce into `0`.
4. `swapFeeBps` / `swapFeeRecipient` are sent only when a positive affiliate fee is actually configured.
5. Temporary debug logging used during diagnosis was removed before final deploy.

## Deployment and public checks

- initial hardening deploy baseline: `e0a16d5`
- current local source includes the final live-fix on top of that baseline
- public checks after activation/fix:
  - `https://24wallet.ru/health` -> `200`
  - `https://24wallet.ru/api/swap/evm/status` -> `configured:true`
  - `https://24wallet.ru/api/swap/evm/0x/price?...` -> `200`
  - `https://24wallet.ru/api/swap/evm/0x/quote?...` -> `200`
  - `https://24wallet.ru/api/market/prices?...` -> `200`
  - `https://24wallet.ru/extension-smoke` -> `200`
  - `https://bstcrm.ru/healthz` -> `200`
  - `node scripts/smoke-zerox-live.mjs` -> `PASS`

## Known limitations

- 0x flow is currently EVM-only
- AllowanceHolder remains the active execution model
- Permit2 execution is not implemented in this wave
- Solana/Jupiter, Tron, Bitcoin, TON, and cross-chain swaps remain out of scope
- no automatic real swap execution is enabled
