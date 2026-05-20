# White/Purple Explore and Extension Polish Report

Date: 2026-05-20

## Scope

- Normalized the web shell toward a white/purple product palette.
- Fixed the global market search contrast so typed and placeholder text remain readable.
- Split Explore into selectable sections: Trending tokens, Top tokens, Top gainers, Top losers, and Top memes.
- Moved Meme Radar into the Top memes tab and added paged browsing for market lists.
- Added backend paging/sorting support for `/api/explore/top`.
- Fixed token Share behavior with native `navigator.share` plus clipboard fallback.
- Removed Price source and Chart source metric cards from token pages.
- Added multi-network explorer dropdown support on token pages, including an EVM explorer fallback from chain config.
- Reworked the extension popup toward a simple wallet-card UX: balance, Send/Receive cards, portfolio link, recent activity, and a settings sheet.

## Files Changed

- `apps/api/src/app.ts`
- `apps/extension/src/popup/index.ts`
- `apps/extension/src/popup/receive-composer.test.ts`
- `apps/extension/static/popup.html`
- `apps/web/app/explore/page.tsx`
- `apps/web/app/explore/explore-client.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx`
- `apps/web/components/global-market-search.tsx`
- `apps/web/components/token-chart.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/api.test.ts`
- `apps/web/lib/universal-explorer.ts`
- `apps/web/lib/universal-explorer.test.ts`
- `packages/shared/src/explore.ts`

## Validation

- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm test`

Local browser smoke confirmed:

- Explore renders 12 rows in the active tab.
- Search input uses dark text on a white shell.
- Explore tabs expose friendly labels.
- Token pages keep Share visible and remove Price source / Chart source cards.
- Market cap, liquidity, and 24h volume labels are present when token detail data is available.

## Known Limits

- Token liquidity still depends on DexScreener/CoinGecko availability for a given asset.
- Non-EVM swap execution remains gated.
- The extension settings sheet is a user-facing settings surface; the deeper provider/debug tools remain available through the advanced options page.
