# Real Market Provider + Token Discovery Plan

## Current status

- `apps/api/src/market/provider.ts` использует только `MockMarketDataProvider`.
- `MarketPriceCache` и `MarketChartCache` уже существуют, но route `/api/market/prices` пока просто читает кэш и сразу падает обратно на mock без TTL/freshness semantics.
- `UserToken` уже есть, но enrichment market metadata/risk fields не хранится.
- `/tokens/add` пока полностью manual: address + symbol + name + decimals, без preview/discovery.
- `/tokens/[chainId]/[tokenAddress]` показывает только цену и mock chart без provider/risk/liquidity/volume.
- Dashboard уже считает портфель, но не показывает provider/risk badges и не использует richer market metadata.
- VPS healthy, Prisma active, current public URL: `http://85.239.59.199:8080`.

## Scope

- Добавить Dexscreener provider для token discovery и real token prices.
- Добавить CoinGecko fallback для native/major assets.
- Сохранить Mock provider как fallback и chart fallback.
- Реализовать cache-first strategy с fresh cache, stale cache и mock fallback.
- Добавить simple in-process rate limiting для public market APIs.
- Добавить token discovery endpoint и enrichment полей у кастомных токенов.
- Обновить UI: source/provider badges, risk badges/flags, liquidity/volume, discovery preview, warning states.
- Освежить дизайн в сторону light glassmorphism / modern crypto wallet.

## Non-scope

- Платные API или обязательные API keys.
- Solana, Tron, NFT, WalletConnect, dApp browser, swap, crosschain.
- Домены, HTTPS, SSH hardening, password rotation, firewall.
- Любая backend custody или хранение сидов/ключей/passcode.
- Реальный historical chart provider beyond mock fallback.

## Provider architecture

- `MockMarketDataProvider` остаётся и даёт deterministic fallback prices/charts.
- `DexscreenerMarketDataProvider` отвечает за EVM token discovery и token-address-driven market enrichment.
- `CoinGeckoMarketDataProvider` покрывает крупные символы и native assets.
- `CompositeMarketDataProvider` оркестрирует порядок: Dexscreener → CoinGecko → Mock fallback.
- `TokenDiscoveryProvider` интерфейс добавляется поверх market provider abstraction.

## Dexscreener provider

- Использует `/latest/dex/tokens/{tokenAddress}`.
- Выбирает лучшую pair по liquidity/volume/marketCap score и фильтрует по chainId.
- Возвращает `TokenDiscoveryResult` c pair url, dex id, liquidity, volume, market cap/fdv.
- Вычисляет heuristic risk flags: `low_liquidity`, `price_unavailable`, `new_pair`, `high_volatility`, `unknown_honeypot_status`, `unverified`.

## CoinGecko fallback

- Использует public `simple/price` endpoint без API key.
- Маппит `ETH/WETH/BNB/MATIC/POL/USDT/USDC` в CoinGecko IDs.
- Используется для native majors и missing symbols после Dexscreener.

## Mock fallback

- Включается явно через `MARKET_PROVIDER_MODE=mock`.
- Также используется при rate-limit exceed, внешних API failure или отсутствии live data.
- Charts в этой волне остаются mock fallback even in real mode.

## Cache strategy

- Ввести `MARKET_CACHE_TTL_SECONDS` и `MARKET_STALE_CACHE_TTL_SECONDS`.
- Fresh cache возвращается как `sourceStatus: "cached"`.
- Если live fetch не удался, route возвращает stale cache как `sourceStatus: "stale_cache"` и добавляет `stale_price`.
- Если нет usable cache, отдаётся mock fallback с `fallback_mock` и `mock_price`.
- Live/mock results upsert-ятся обратно в `MarketPriceCache`; charts аналогично с mock fallback.

## Rate limit strategy

- In-process `SimpleWindowRateLimiter` контролирует внешний трафик к public APIs.
- На exceed — backend не падает, а отдаёт cache/mock path.
- Ошибки внешних API не пробрасываются наружу как hard failure для market endpoints/discovery.

## Token discovery flow

1. Пользователь вводит contract address на `/tokens/add`.
2. Frontend читает onchain metadata через `readErc20TokenMetadata`.
3. Frontend вызывает `/api/market/discover-token`.
4. UI показывает preview: symbol, name, decimals, provider, liquidity, volume, pair url, risk flags.
5. При сохранении enriched payload отправляется в `POST /api/user-tokens`.

## Risk flags

- `unverified`
- `low_liquidity`
- `price_unavailable`
- `high_volatility`
- `unknown_honeypot_status`
- `new_pair`
- `mock_price`
- `stale_price`

## Backend API changes

- Обновить `env.ts` и `.env.example` market settings.
- Расширить Prisma schema и store DTOs/implementations.
- Добавить `apps/api/src/market/http.ts`, `rate-limit.ts`, `cache.ts`, `dexscreener-provider.ts`, `coingecko-provider.ts`.
- Обновить `provider.ts` до composite provider.
- Добавить `/api/market/discover-token`.
- Расширить `/api/market/prices` TTL/stale cache logic.
- Расширить `POST /api/user-tokens` enriched fields.

## Frontend changes

- Расширить `apps/web/lib/api.ts` discovery types/functions.
- Расширить `apps/web/lib/portfolio.ts` данными provider/risk/liquidity/source status.
- Обновить `AssetList` badges и enriched token rows.
- Обновить token details page с warning box, pair link, market stats.
- Обновить add-token flow на preview-first UX.
- Обновить `globals.css` и связанные screens под bright premium crypto UI.

## Testing plan

- API tests на market routes, discovery route, enriched user token persistence, sensitive field rejection, fallback behavior.
- Unit tests на `SimpleWindowRateLimiter`, cache helpers и risk helper (если экспортируется).
- Web tests на discovery preview, provider/risk badges, same-origin discovery client.
- Wallet-core tests на token metadata failure path и отсутствие regression.
- Root `pnpm test`, `pnpm build`, `git diff --check`.

## VPS deployment plan

- Локально: build/test/generate Prisma client.
- Собрать архив без `.git`, `node_modules`, `.next`, `dist`, `coverage`, `tmp`, `backups`, `.env`.
- Залить на `/opt/acorus-wallet`, сохранить live `.env`.
- `docker compose build api web && up -d api web nginx`.
- `prisma db push` при необходимости.
- Проверить `/health`, `/api/market/prices`, `/api/market/chart`, `/api/market/discover-token`, public URL и persistence before/after restart.

## Known risks

- Public Dexscreener/CoinGecko APIs могут rate-limit или временно деградировать.
- Dexscreener historical charts в MVP не реализуются стабильно, поэтому charts останутся mock fallback.
- Risk flags — это heuristics, не security audit и не honeypot guarantee.
- Current VPS остаётся HTTP-only на `:8080`; infra security intentionally out of scope for this wave.
