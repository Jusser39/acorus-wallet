# Universal Swap Quote Engine Plan

## Current status
Acorus Wallet is now documented as a universal multichain wallet + swap + dapp shell. Adapter expansion, universal swap shell and dapp shell plans exist. No real swap execution exists yet.

## Product direction
Swap must be universal: From Network + From Asset + Amount → To Network + To Asset → Quote → Route Preview → Review → later Execute.

## Scope
- Shared swap quote type alignment
- SwapQuoteProvider interface
- Mock universal quote provider
- SwapQuoteEngine
- Backend POST /api/swap/quote
- Frontend getSwapQuote API helper
- Swap UI helper types
- /swap page
- SwapComposer component
- Route preview component
- Execution disabled state
- Tests/build/VPS deploy

## Non-scope
- Real swap execution
- ERC-20 approve
- Signing/broadcast
- Jupiter live execution
- 0x/1inch execution
- Tron swap execution
- Cross-chain execution
- WalletConnect/dApp browser
- Domain/HTTPS/SSH hardening

## Safety
- Quote only
- No private keys
- No approvals
- No backend custody
- No transaction broadcast
- UI must say execution is coming later

## Implementation phases
1. Shared swap type alignment
2. Provider interface
3. Mock provider
4. Quote engine
5. API route
6. Web API helper
7. Swap UI helpers
8. SwapComposer
9. Route preview
10. Tests/build/VPS deploy

## Known risks
- Accidentally implying real swap is live
- Confusing same-chain and cross-chain routes
- Overfitting to EVM provider
- Using fake quote as price truth
- Type drift between shared/wallet-core/web/api
