# Wallet Product Benchmark + UX Upgrade Report

## Scope

Analyzed leading wallet and DEX products and implemented the first Acorus
product UX shells inspired by the best patterns, without copying branding or
code.

## Benchmarked

- MetaMask
- Trust Wallet
- Uniswap Wallet
- PancakeSwap

## Adopted product patterns

- Extension-ready thinking
- Universal dashboard action grid
- Explore Web3 shell
- Security Center shell
- dApp shell placeholder
- Chrome extension roadmap page
- Quests shell
- Swap-first product positioning
- Multichain-first UX language

## Implemented

- `docs/wallet_competitor_benchmark.md`
- `docs/chrome_extension_roadmap.md`
- `docs/product_ux_upgrade_plan.md`
- `apps/web/lib/product-features.ts`
- `apps/web/components/product-feature-card.tsx`
- `apps/web/components/wallet-action-grid.tsx`
- `/explore`
- `/security`
- `/dapps`
- `/extension`
- `/quests`
- navigation updates
- dashboard action grid

## Non-scope

- Real Chrome extension
- WalletConnect
- dApp browser
- Signing provider
- Real staking and farming
- Real quests
- Real NFT
- Real swap execution

## Safety

- All future or unsafe features are marked preview or planned
- No dApp can connect yet
- No website can access keys
- No extension provider is injected
- No approvals, signatures, or broadcasts were added in this wave

## Checks

- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- VPS health
- public route smoke
- persistence after restart

## Next wave options

1. Chrome Extension Architecture Skeleton
2. Universal dApp Session / Permission Shell
3. EVM Live Quote Provider Integration
4. Real Explore token discovery
