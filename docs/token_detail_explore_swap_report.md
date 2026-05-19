# Token Detail Explore Swap Report

Date: 2026-05-20

## Implemented

- Explore token cards now link to internal token detail pages instead of leaving discovery as a dead-end list.
- Added `apps/web/lib/token-routes.ts` so CoinGecko/DexScreener items, chain keys, native symbols, and skeleton networks resolve to stable Acorus token URLs.
- Reworked `/tokens/[chainId]/[tokenAddress]` into a trading-style token page:
  - token header with network/family/source context;
  - price and 24h change;
  - market cap, liquidity, volume, source, and risk cards;
  - hoverable SVG chart;
  - intervals: `1h`, `1d`, `1w`, `Month`, `Year`, `All time`;
  - sticky EVM 0x swap panel for EVM tokens;
  - honest non-EVM swap-gated state.
- Extended market chart range types and API validation to `1H`, `1D`, `1W`, `1M`, `1Y`, `ALL`.
- Updated mock and CoinGecko chart providers for the new range vocabulary.
- Made `SwapComposer` accept initial chain/sell/buy tokens so token pages can preselect "buy this token".

## Checks Run

- `pnpm --filter @acorus/shared build` passed.
- `pnpm --filter @acorus/web test -- lib/token-routes.test.ts` passed.
- `pnpm --filter @acorus/api test -- src/api.test.ts` passed.
- `pnpm --filter @acorus/web build` passed.
- `pnpm --filter @acorus/api build` passed.
- `git diff --check` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- Local browser smoke opened `/tokens/1/native?family=evm&symbol=ETH&name=Ethereum` and verified token title, market chart, `All time` interval, and embedded `Swap ETH` panel render.

Note: one parallel build attempt hit a Windows `EPERM` file-lock while two builds cleaned `packages/wallet-core/dist`; the same builds passed when rerun sequentially.

## Known Limits

- Token-page swap is still 0x/EVM only.
- Solana token detail pages show market/chart information when numeric chain data is available, but swap execution is still gated until the Jupiter wave.
- Bitcoin/Ton/Tron native pages are clickable discovery pages, not live swap pages.
- `1H` chart uses provider one-day data when CoinGecko is the live source; mock fallback emits a true hour-shaped series.

## Next Step

- Add a token-search/detail API that can resolve CoinGecko IDs and DexScreener chain keys into richer canonical token metadata before rendering the page.
- Then add Solana/Jupiter quote-only swap on token pages without enabling execution until the Solana swap adapter is reviewed.
