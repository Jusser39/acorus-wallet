# Uniswap-Like Token Details, Search, and Home Swap Report

## Implemented

- Added backend token detail, CoinGecko coin chart, and market search routes.
- Added CoinGecko coin detail/search support with descriptions, links, market cap, FDV, 24h volume, high/low, logos and platform mappings.
- Added DexScreener search support for pools/tokens and enriched token discovery with website/social/logo metadata.
- Fixed explore token links so CoinGecko-only tokens such as XRP route to `/tokens/coingecko/{id}` instead of `/tokens/1/native`.
- Upgraded token pages to load canonical CoinGecko detail/chart data, render richer stats/about/links/share actions, and preselect EVM token pages in the 0x swap composer when a platform contract is known.
- Added a global header search for tokens, pools and wallet addresses.
- Added a real 0x EVM swap panel on the wallet home screen.
- Hardened development CSP so local wallet smoke tests can hydrate React and reach the local API without weakening production CSP.
- Added richer CoinGecko-id fallback detail/chart data for major assets such as XRP, so rate-limit fallback no longer renders zero-value charts or empty stats.
- Removed non-wallet domain references from wallet docs/memory.

## Checks

- `pnpm --filter @acorus/web test` passed.
- `pnpm --filter @acorus/web build` passed.
- `pnpm --filter @acorus/api test` passed.
- `pnpm --filter @acorus/api build` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `git diff --check` passed.

## Local Smoke

- `GET /api/market/token-detail?coinId=ripple&currency=USD` returned XRP live detail with market cap, FDV, 24h volume and 3 external links.
- `GET /api/market/coin-chart?coinId=ripple&currency=USD&range=1H|1D|1W|1M|1Y|ALL` returned usable chart points; `ALL` can use the safe non-zero fallback when CoinGecko rate-limits public max-history requests.
- Browser smoke on `/tokens/coingecko/ripple?source=coingecko&symbol=XRP&name=XRP` confirmed market cap, FDV, 24h volume, high/low, about text, Blockchain/Website/X links, share action, global search, and a visible chart.
- Browser smoke on `/` confirmed the home screen renders the 0x EVM swap composer with network/token inputs and quote action.

## Known Limits

- Liquidity is available when DexScreener has a DEX pair; CoinGecko-only assets can still show market cap/FDV/volume while liquidity remains unavailable.
- 0x swap execution is still EVM-only.
- Solana, Tron, BTC, TON and cross-chain swap execution remain gated for later waves.
