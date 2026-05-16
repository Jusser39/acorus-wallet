# Universal Swap Quote Engine Report (Wave 6)

## Status: Implemented, Validated, Deployed

## What was built

### Shared types (`packages/shared/src/multichain.ts`)
- Canonical universal swap quote types now live in `@acorus/shared`
- Added `SwapQuoteStatus`, `SwapProviderId`, `SwapSlippageMode`, `SwapQuoteRequest`, `SwapRouteStep`, `SwapQuote`
- Quote model now fits the universal shell contract: `from` + `to` assets, route preview, slippage, minimum received, warnings/errors, provider metadata

### Wallet-core swap foundation (`packages/wallet-core/src/swap/*`)
- `provider.ts` — `SwapQuoteProvider`, provider capabilities, `isSameChainSwap()`
- `mock-provider.ts` — preview-only mock quote provider for same-chain and cross-chain routes
- `quote-engine.ts` — `SwapQuoteEngine` with provider selection and `createDefaultSwapQuoteEngine()`
- `index.ts` / root exports updated so swap foundation is part of the public wallet-core surface

### API (`apps/api/src/app.ts`)
- Added `POST /api/swap/quote`
- Route validates `from`, `to`, and amount presence
- Route rejects sensitive payload fields (`mnemonic`, `seed`, `privateKey`, `passcode`) with `400 sensitive_fields_not_allowed`
- Backend stays quote-only: no approve, no signing, no broadcast

### Web (`apps/web/*`)
- `apps/web/lib/api.ts` now exposes `getSwapQuote()`
- `apps/web/lib/swap-ui.ts` and `apps/web/lib/swap-assets.ts` provide universal swap composer state and asset option helpers
- `apps/web/components/swap-composer.tsx` adds the universal flow: network/asset selection, amount input, slippage, quote request
- `apps/web/components/swap-route-preview.tsx` shows provider, route, minimum received, price impact, warnings, and errors
- `apps/web/app/swap/page.tsx` adds the new `/swap` route
- Wallet nav and wallet quick actions now surface Swap directly

## Tests and validation
- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core test` — 26/26 pass
- `pnpm --filter @acorus/api test` — 22/22 pass
- `pnpm --filter @acorus/web test` — 53/53 pass
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## VPS deployment
- Deploy script: `python scripts/deploy_wave6.py`
- Fixed deployment issue: persistence script path needed `scripts/check-persistence.sh`
- Verified on VPS:
  - `GET /health` on loopback and public `:8080`
  - `GET /api/chains`
  - `HEAD /swap`
  - `POST /api/swap/quote` returns preview quote
  - sensitive-field POST returns `400 {"error":"sensitive_fields_not_allowed"}`
  - `scripts/check-persistence.sh` passes before restart and with `CHECK_MODE=verify` after `docker compose restart api`

## Safety invariants maintained
- Quote preview only; execution CTA remains disabled / coming soon
- No ERC-20 approvals, no allowances, no signature requests, no transaction broadcast
- Backend still never receives mnemonic/privateKey/passcode
- Cross-chain UI is clearly labeled preview-only, not executable

## Known limitations
- The default provider is mock-only; quote values are preview data, not executable market truth
- `/swap` currently uses fallback/native asset options when live portfolio assets are not yet wired into the composer
- Local Docker regression is still blocked on this workstation because `dockerDesktopLinuxEngine` is unavailable

## Next implementation layer
- Add live provider adapters behind the same contract: 0x / 1inch / ParaSwap first, then Jupiter, SunSwap, and cross-chain providers such as LI.FI / Rango / Socket
