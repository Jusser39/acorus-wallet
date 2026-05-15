# EVM Token Details + Market Data + Portfolio UX Report

## Wave: EVM Token Details + Market Data + Portfolio UX
**Date:** 2026-05-15
**Commit range:** 98af5c0 → 0ce9176 (master)

## Summary

Implemented full EVM portfolio + market data wave across all layers:
backend models, API routes, frontend portfolio service, UI components, and new screens.

## Files Changed

### New Files
| File | Description |
|------|-------------|
| `packages/shared/src/market.ts` | Shared market types: FiatCurrency, TokenPrice, TokenChart, PortfolioAsset, PortfolioSummary |
| `apps/api/src/market/provider.ts` | MockMarketDataProvider with pseudo-prices (seeded by symbol) and chart generation |
| `apps/api/src/market/index.ts` | Re-export barrel |
| `packages/wallet-core/src/evm/portfolio.ts` | getEvmNativeBalance / getEvmTokenBalance helpers |
| `packages/wallet-core/src/evm/token-metadata.ts` | readErc20TokenMetadata (symbol, name, decimals) via viem |
| `apps/web/lib/portfolio.ts` | loadEvmPortfolioSummary (live + practice mode) |
| `apps/web/components/portfolio-summary-card.tsx` | Total value card with 24h change |
| `apps/web/components/asset-list.tsx` | Per-asset rows with fiat value + 24h change + detail links |
| `apps/web/components/token-chart.tsx` | SVG sparkline chart |
| `apps/web/app/tokens/add/page.tsx` | Add custom ERC-20 token screen |
| `apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx` | Token detail page with price + chart |

### Modified Files
| File | Change |
|------|--------|
| `packages/shared/src/index.ts` | Added `export * from "./market"` |
| `apps/api/prisma/schema.prisma` | Added UserToken, MarketPriceCache, MarketChartCache models; User.userTokens relation |
| `apps/api/src/store.ts` | Added FiatCurrency, UserTokenDto, MarketPriceDto, MarketChartDto types; extended AppStore interface with 8 new methods |
| `apps/api/src/memory-store.ts` | Implemented new methods with in-memory Maps |
| `apps/api/src/prisma-store.ts` | Implemented new methods with Prisma ORM; added shape type helpers |
| `apps/api/src/app.ts` | Added /api/user-tokens CRUD, /api/market/prices, /api/market/chart routes |
| `packages/wallet-core/src/index.ts` | Added exports for portfolio and token-metadata |
| `apps/web/lib/api.ts` | Added UserToken, MarketPrice, MarketChart types and 6 new API functions |
| `apps/web/app/wallet/page.tsx` | Full rebuild: PortfolioSummaryCard, AssetList, + Add token link |

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user-tokens?userId=&walletProfileId=` | List user's custom tokens |
| POST | `/api/user-tokens` | Add custom token |
| PATCH | `/api/user-tokens/:id/visibility` | Toggle token visibility |
| DELETE | `/api/user-tokens/:id` | Remove token |
| GET | `/api/market/prices?chainId=&currency=&symbols=` | Get token prices (cached) |
| GET | `/api/market/chart?chainId=&currency=&symbol=&range=` | Get price chart (cached) |

## Architecture Notes

### MockMarketDataProvider
- Prices based on hardcoded USD base prices × FX multiplier (EUR=0.92, RUB=92)
- Pseudo-deterministic 24h change derived from symbol character sum
- Chart points: sin-wave drift around base price (amplitude 3.5%)
- Caching: prices/charts are written to DB on first fetch, served from cache on subsequent requests

### Prisma Null Sentinel
- Compound unique constraints in PostgreSQL/Prisma do not allow null in the where clause
- Native tokens (no contract address) use `""` as `tokenAddress` sentinel value
- `toMarketPriceDto`/`toMarketChartDto` convert `""` back to `null` in responses

### Portfolio Service (`apps/web/lib/portfolio.ts`)
- Practice mode: returns static balances, no network calls
- Live mode: fetches native + ERC-20 balances in parallel, then fetches prices
- Errors in individual balance/price fetches are non-fatal
- Weighted average 24h change calculated from fiat-value-weighted assets

## Test Results

| Suite | Status |
|-------|--------|
| `@acorus/api` (vitest) | 11/11 passed |
| `@acorus/wallet-core` (vitest) | 9/9 passed |
| `@acorus/web` (Next.js build + TypeScript) | ✓ compiled, all 17 routes generated |
| `@acorus/shared` (tsup) | ✓ built |

## VPS Verification

```
GET  /health                                          → 200 {"status":"ok","store":"prisma"}
GET  /api/market/prices?chainId=1&currency=USD&symbols=ETH,USDT  → 200 [{ETH,$3200},{USDT,$1}]
GET  /api/market/chart?chainId=1&currency=USD&symbol=ETH&range=7D → 200 {28 chart points}
POST /api/user-tokens (with valid userId)             → 201 {token object}
GET  /api/user-tokens?userId=...                      → 200 {tokens:[...]}
```
