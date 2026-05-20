# Uniswap-Like Token Details, Search, and Home Swap Plan

## Goal

Make Acorus token discovery feel like a real trading surface:

- canonical token pages for CoinGecko market tokens instead of forcing unknown assets into an EVM-native fallback;
- token pages with richer market data, chart ranges, about text, explorer/site/social/share actions;
- top navigation search across tokens, pools, and wallet addresses;
- a real 0x EVM swap composer on the home screen.

## Data Sources

- CoinGecko `/coins/{id}` for metadata, descriptions, links, market cap, FDV, 24h volume, high/low and platform contract mappings.
- CoinGecko `/coins/{id}/market_chart` for 1h, 1d, 1w, 1m, 1y and all-time charts.
- CoinGecko `/search` for token search.
- DexScreener `/latest/dex/search` and token/pair payloads for pools, liquidity, pair links and DEX metadata.
- 0x Swap API remains backend-proxied for EVM swaps only.

## Security

- No wallet secrets, passcodes, seed phrases, private keys or signing payloads are sent to market APIs.
- 0x API keys remain backend-only.
- Search requests contain only public query text or public addresses.

## Out Of Scope

- Solana/Jupiter swap execution.
- Tron/BTC/TON swap execution.
- Cross-chain swaps.
- WalletConnect execution.
