# Token Management + Real Charts Plan

## Current status
Acorus Wallet already has EVM portfolio, token details, custom token add flow, Dexscreener/CoinGecko/mock market providers, source/risk metadata and Prisma persistence.

## Scope
- Real historical charts for major assets via CoinGecko
- Mock chart fallback
- Chart cache-first logic
- Token hide/unhide from dashboard
- Custom token management
- Curated token visibility overrides
- /tokens/manage page
- Token details range selector
- Docs/tests/VPS rollout

## Non-scope
- Solana
- Tron
- NFT
- Swap
- WalletConnect
- dApp browser
- Domain/HTTPS/SSH hardening
- Mainnet transaction logic changes

## Implementation phases
1. Shared type alignment
2. API store visibility operations
3. Real CoinGecko chart provider
4. Composite provider chart fallback
5. API route cache logic update
6. Frontend API client
7. Token management UI
8. Dashboard hide/unhide integration
9. Token details chart range selector
10. Tests/build/VPS deploy

## Risks
- CoinGecko public API rate limits
- Some custom tokens have no historical charts
- Chart fallback must not break UI
- Risk flags are not contract audit
