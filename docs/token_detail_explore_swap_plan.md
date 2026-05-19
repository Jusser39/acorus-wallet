# Token Detail Explore Swap Plan

Date: 2026-05-20

## Goal

Make Explore behave like a trading discovery surface: every token card opens an internal token detail page with market context, interactive chart intervals, and an adjacent swap panel.

## Scope

- Link Explore trending, top, and meme tokens to `/tokens/[chainId]/[tokenAddress]`.
- Support native-token and skeleton-chain token detail routes for discovery pages.
- Upgrade token detail UI with price, source status, liquidity, volume, market cap, risk notes, and a sticky swap area.
- Extend chart ranges to `1H`, `1D`, `1W`, `1M`, `1Y`, and `ALL`.
- Add hover inspection to the SVG chart.
- Reuse the existing backend-proxied 0x EVM swap composer on EVM token pages.

## API Model

- 0x remains the implemented EVM swap provider. The backend keeps the `ZEROX_API_KEY` and calls the AllowanceHolder `/price` and `/quote` flow.
- Uniswap Swapping API was reviewed as a product/API reference. Its documented approval-check, quote, and transaction flow confirms the same security boundary: API quote work is separate from wallet-signed on-chain execution.
- Solana/Jupiter, Tron, Bitcoin, TON, and cross-chain swaps remain gated in this wave.

## Risks

- Some Explore providers return market symbols without a concrete chain/token address. These routes now fall back to known native-token pages when possible, otherwise a safe EVM/native discovery page.
- CoinGecko does not provide every interval exactly as the UI labels it. The API maps `1H` to a one-day provider range and `ALL` to provider `max`; mock fallback produces interval-shaped data for every range.
- Token page swap execution is EVM-only. Non-EVM token pages show a clear coming-next state.

## Validation

- Web token-route tests cover internal Explore links.
- API chart tests cover all token-page ranges.
- Web/API builds must pass before deploy.
