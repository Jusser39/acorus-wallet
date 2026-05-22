# Acorus Design System Report

## Summary

Implemented a premium white/purple UI foundation for Acorus Wallet and aligned the most visible wallet/trading surfaces around reusable tokens and components.

## Files Changed

- `apps/web/app/globals.css`
- `apps/web/app/page.tsx`
- `apps/web/app/explore/explore-client.tsx`
- `apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx`
- `apps/web/app/design-system/page.tsx`
- `apps/web/components/swap-composer.tsx`
- `apps/web/components/ui/*`
- `apps/web/lib/swap-cta.ts`
- `apps/extension/static/popup.html`

## Implemented

- Normalized the global product palette to light white/violet with shared Acorus tokens.
- Added reusable UI primitives and a design-system smoke route.
- Made the home page open with a premium wallet + swap trading shell.
- Added deterministic swap CTA labels for extension, quote, approval, stale quote, and wrong-chain states.
- Improved Explore with volume-aware rows and shimmer skeletons.
- Added token detail actions for trade, copy address, share, explorer, website, and receive.
- Polished the extension popup shell toward the same white/purple brand system.

## Security Boundary

- No mnemonic, private key, passcode, raw signing payload, or provider secret handling was changed.
- 0x/Jupiter/Rango provider keys remain backend-only.
- Swap execution behavior remains unchanged: only the reviewed EVM/0x path can broadcast after extension approval.

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

## Known Limitations

- Jupiter and Rango remain review-only.
- Non-EVM swaps and cross-chain execution remain gated.
- Some older deep pages still rely on global light-theme overrides and can be further migrated to the new component primitives.
