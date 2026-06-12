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

- [12 Jun] Completed all 11 MV3 extension patches, resolving critical bugs in state mapping, origins, and timeout issues. Re-bundled the extension to 'extension.zip' and copied it to the 'public/' directory of the web app so it can be served dynamically. Pushed to Github and initiated a VPS deployment. Confirmed TON dApp links are present and functional. The Apple Pay and Credit card purchase methods are already integrated and enabled in both Web and Extension.
