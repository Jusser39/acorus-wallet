# Market UI Real Data Stabilization Report

Date: 2026-05-20

## Scope

- Remove user-facing mock/fallback market data from public Explore, token detail, and chart surfaces.
- Stabilize CoinGecko token charts across `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL`.
- Keep token pages in the white/purple Acorus visual system and remove noisy unsupported cards.
- Refresh the home screen into a more informative wallet dashboard instead of the previous decorative token shell.
- Rebuild the Chrome extension package after the UI/API stabilization.

## Implemented

- Public market price/chart endpoints no longer return generated mock prices or `fallback_mock` charts when live providers are unavailable.
- CoinGecko coin charts now map major ids to proper symbols, including `the-open-network -> TON`.
- `ALL` chart requests first try CoinGecko max/range history and fall back to a live 365-day window if CoinGecko rate-limits long history.
- Token chart badges hide `mock`, `fallback_mock`, and `unavailable` labels instead of showing noisy implementation state.
- Token detail pages no longer render Risk, Price source, Chart source, or empty Quote preview panels.
- Explore rows no longer show provider/mock source text; rows rely on token names, symbols, logos, price, market cap, and change.
- Home page now shows a wallet-focused dashboard with create/import/extension/explore actions, swap capability, live discovery panels, and multichain feature cards.
- Root layout now defaults to a light white/purple palette so pages do not accidentally inherit white text from the old dark body.
- The extension zip was rebuilt at `apps/web/public/downloads/acorus-wallet-extension.zip`.

## Validation

- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core build`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm extension:package`

## Local Smoke

- TON chart API was checked for all ranges. `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL` returned symbol `TON`; `ALL` returned live CoinGecko data via the 365-day fallback when max-history was rate-limited.
- Solana token detail API returned live CoinGecko price and market data instead of the old `$150` fallback.
- Browser smoke on the Solana token page confirmed user-facing `mock`, `Risk`, `Quote preview`, `Price source`, and `Chart source` text are gone.

## Known Limits

- CoinGecko can still rate-limit public unauthenticated requests; the UI now shows honest unavailable states instead of fabricated data.
- Local browser dev without a same-origin `/api` proxy cannot fully hydrate token pages unless `NEXT_PUBLIC_API_URL` is provided before starting Next. Production nginx provides the `/api` route.
- Automated Chrome unpacked-extension loading was attempted in an isolated profile, but Chrome did not expose the Acorus extension target reliably in this environment. Extension source tests/build/package passed, and manual install remains through `chrome://extensions` -> Load unpacked `apps/extension/dist` or the packaged zip.
