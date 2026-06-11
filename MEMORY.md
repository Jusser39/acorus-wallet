# Acorus Wallet Memory

This file serves as a persistent memory block for the agents working on the Acorus Wallet project. It tracks what has been implemented, known issues, and important context. Agents must update this file via the `DeployAndMemoryAgent` to ensure the context is always up to date.

## Implemented Features
- **Extension Connection Flow**: `PopupApp.tsx` correctly handles `DappSessionProposal` by displaying the `ConnectionApproval.tsx` modal.
- **TON Ecosystem Support**: TON dApps (STON.fi, DeDust, Getgems, Fragment, Catizen, TapSwap, Notcoin) are added to the Web dApp directory. Extension injects `window.tonkeeper` and handles `ton_connect` natively.
- **Prediction Markets**: `predictions/page.tsx` has live betting functionality with a modal. Uses `acorus_sendTransaction` to prompt the wallet.
- **Fiat Onramp (Buy)**: Integrated Transak for Apple Pay and Credit Cards on both Web App (`/buy`) and Extension UI. Opens external URLs for secure checkout.
- **Deployment Process**: Changes should be pushed to GitHub, then deployed to VPS via `python scripts/deploy_vps.py`.

## Known Caveats
- Some top-tier DApps (like Uniswap) block iframes (`X-Frame-Options: DENY`), so the web DApp directory must open them natively in a new tab instead of the internal browser view.
- Always remember to deploy manually or via `DeployAndMemoryAgent` after `git push`.
