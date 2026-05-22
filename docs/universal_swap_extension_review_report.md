# Universal Swap Extension Review Report

## Status

Implemented locally. Validation passed. Commit/deployment are the remaining
handoff steps for this wave.

## Changed Areas

- Shared dApp types now include `universal_swap` review details for Jupiter and Rango.
- Extension runtime protocol now has a `queue_universal_swap_approval` message for internal surfaces.
- Extension background can queue Jupiter/Rango routes as swap approval requests and resolves them as review-only previews after approval.
- Extension popup renders a dedicated Universal Swap approval card with provider, route, sell/buy summary, slippage, expiration, and review-only status.
- Web swap composer can request Jupiter/Rango route review in the extension after a backend-proxied quote is loaded.

## Security Notes

- 0x remains the only enabled live swap execution path.
- Jupiter/Rango approval cards do not show raw transaction data, calldata, or JSON blobs.
- Jupiter and Rango provider keys remain backend-only env values.
- Non-0x swap approvals do not broadcast transactions in this wave.

## Tests Added

- Extension source-regression coverage for universal swap queue and review-only execution.
- Popup source-regression coverage for universal swap cards without raw transaction blobs.
- Web source-regression coverage for Jupiter/Rango extension review controls.

## Validation

- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core build`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `pnpm extension:package`

All listed checks passed locally. `git diff --check` only reported expected
Windows line-ending warnings and no whitespace errors.

## Known Limitations

- Jupiter Solana swap transaction signing is not enabled yet.
- Rango cross-chain route execution is not enabled yet.
- WalletConnect execution remains outside this wave.
