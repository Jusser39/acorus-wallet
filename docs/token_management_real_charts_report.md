# Token Management + Real Charts Report

## Summary

This wave adds real historical CoinGecko charts for supported major assets, keeps mock chart fallback for unsupported/custom tokens, introduces cache-first chart semantics, and ships user token management across the dashboard and a dedicated `/tokens/manage` screen.

## Backend

### Store and DTO updates

- `packages/shared/src/market.ts` now exposes `ChartRange` and extends chart source status values.
- `apps/api/src/store.ts` now includes:
  - `hideToken(...)`
  - `unhideToken(...)`
  - richer market/chart DTO fields
  - parsed `riskFlags` support on user tokens and market prices

### MemoryStore / PrismaStore

- `createUserToken()` now normalizes token addresses
- `deleteUserToken()` only allows deleting custom tokens
- `hideToken()` creates or updates hidden overrides
- `unhideToken()` clears hidden overrides for existing user tokens
- Prisma price cache persistence now keeps:
  - `sourceStatus`
  - `liquidityUsd`
  - `pairUrl`
  - `riskLevel`
  - `riskFlagsJson`

### Market chart providers

- `CoinGeckoMarketDataProvider.getChart()` now fetches real historical candles using:
  - `1D`
  - `7D`
  - `1M`
  - `3M`
  - `1Y`
- supported chart symbols include major mapped assets such as:
  - ETH / WETH
  - BNB
  - MATIC / POL
  - USDT / USDC
  - DAI
  - AVAX
- unsupported symbols now fall back to mock charts instead of breaking the route

### Composite provider behavior

- chart requests now prefer CoinGecko
- if live chart fetch is unavailable or rate-limited, the provider returns mock chart fallback with `sourceStatus: "fallback_mock"`

### API routes

New routes:

- `POST /api/user-tokens/hide`
- `POST /api/user-tokens/unhide`

Updated route:

- `GET /api/market/chart`

Chart route semantics are now:

1. fresh cache hit → `sourceStatus: "cached"`
2. live provider success → `sourceStatus: "live"`
3. stale cached chart still usable → `sourceStatus: "stale_cache"`
4. fallback mock chart → `sourceStatus: "fallback_mock"`

## Frontend

### Dashboard

- asset rows now expose a direct **Hide** action
- hidden curated tokens disappear through user override records
- wallet quick actions now link to `/tokens/manage`

### Token management

New page:

- `/tokens/manage`

Features:

- chain selector
- search by symbol / name / address
- filter by all / visible / hidden / custom
- hide / unhide token actions
- delete custom token action
- curated token visibility overrides

### Portfolio merge logic

`apps/web/lib/portfolio.ts` now merges:

- curated visible tokens
- visible custom tokens
- hidden override records

Behavior:

- curated hidden override works even when the curated token is not a custom token
- custom visible tokens remain included
- hidden custom tokens are excluded from the wallet asset list
- price lookup prefers `tokenAddress + symbol` keys and falls back safely

### Token details

`/tokens/[chainId]/[tokenAddress]` now includes:

- range selector: `1D / 7D / 1M / 3M / 1Y`
- provider/source badges for chart and price
- real CoinGecko chart when supported
- fallback-safe chart rendering
- liquidity / volume / market cap / risk block
- link back to `/tokens/manage`

## Tests and validation

Added/updated checks:

- API test for chart cache-first `sourceStatus`
- API test for hide/unhide token overrides
- web API client test for hide-token route

Validation passed locally:

- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## VPS rollout

Deployment target:

- `http://85.239.59.199:8080`

Executed on VPS:

- uploaded fresh working-tree archive
- `docker compose --env-file .env -f infra/docker-compose.yml build api web`
- `docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx`
- `npx prisma db push --schema prisma/schema.prisma`

Verified on VPS:

- `/health` returns `store: "prisma"`
- `GET /api/market/chart?chainId=1&currency=USD&symbol=ETH&range=1D`
- `GET /api/market/chart?chainId=1&currency=USD&symbol=ETH&range=1M`
- chart responses now come from `provider: "coingecko"` with cache-aware `sourceStatus`
- persistence check passed before restart
- persistence verify passed after `docker compose restart api`

Rollout note:

- the first immediate post-restart verify hit a temporary `502` while the API was still warming up
- the follow-up verify after a short delay passed cleanly

## Known limitations

1. CoinGecko historical charts are available only for supported mapped symbols.
2. Custom ERC-20 tokens without supported historical provider coverage still use mock chart fallback.
3. Visibility overrides remain user-scoped by the existing `UserToken` uniqueness model.
4. Risk badges remain heuristic metadata, not a contract audit.
