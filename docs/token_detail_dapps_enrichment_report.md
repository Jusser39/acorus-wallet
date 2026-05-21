# Token Detail and dApps Enrichment Report

Date: 2026-05-21

## Scope

- Improve CoinGecko token detail resilience for assets such as ETH, ZEC, TON, SOL and VVV.
- Add richer token facts: launch date, categories and supply metrics where public providers expose them.
- Support native ETH explorer choices across multiple EVM networks, including BaseScan.
- Keep token-page swap available for EVM-native assets such as ETH.
- Replace the technical dApp bridge page with a user-facing clickable dApps directory.

## Changes

- `apps/api/src/market/coingecko-provider.ts`
  - Full token detail now merges CoinGecko detail data with safe public metadata.
  - When full `/coins/{id}` detail fails, the API falls back to CoinGecko `/coins/markets` before using Binance 24h ticker fallback.
  - Coin chart fallback now uses GeckoTerminal OHLCV for known EVM tokens such as Venice Token when CoinGecko market charts are unavailable.
  - Added safe metadata for Bitcoin, Ethereum, Solana, Toncoin, Zcash and Venice Token.
  - Ethereum native platforms now include Ethereum, Base, Arbitrum, Optimism, Linea and zkSync explorer choices.
- `apps/api/src/market/provider.ts` and `apps/web/lib/api.ts`
  - Token detail payload now includes `launchedAt`, `categories`, `circulatingSupply`, `totalSupply` and `maxSupply`.
- `apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx`
  - Token pages show launch date, rank, supply and categories.
  - Description text is no longer truncated to a short preview.
  - Native token explorer dropdown supports chain explorer roots when there is no ERC-20 address.
  - CoinGecko native EVM assets can prefill the swap composer with `native` buy token routes.
- `apps/web/components/dapp-directory.tsx`
  - New user-facing dApps directory with categories, search, favicon logos, “See more” expansion and clickable app cards.

## Validation

- `pnpm --filter @acorus/api build` passed.
- `pnpm --filter @acorus/web build` passed.
- `pnpm --filter @acorus/api test` passed.
- `pnpm --filter @acorus/web test` passed.
- `git diff --check` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `pnpm extension:package` passed.
- Local live provider smoke returned market cap, logos, links, platforms and descriptions for Ethereum, Zcash and Venice Token.
- Local Venice Token chart smoke returned live points for `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL`.

## Known Limits

- dApp connection is initiated on the third-party site through the injected Acorus providers; Acorus cannot force a third-party app to accept a provider family the app itself does not support.
- Liquidity remains unavailable on CoinGecko coin-only pages unless a DEX pair provider exposes it.
- Venice launch date is not forced unless a public provider returns it.
