# EVM Wallet UX + Send Flow Report

## Scope

This wave completed the EVM-only wallet UX and send-flow polish for the current Web/PWA deployment at `http://85.239.59.199:8080` without changing the non-custodial boundary.

## Implemented

- Create wallet flow keeps mnemonic local, requires seed backup acknowledgement, encrypts the vault locally, and creates only a public wallet profile on the backend
- Import wallet flow now requires passcode confirmation before local vault encryption
- Unlock flow keeps decryption local and surfaces stored-vault errors safely
- Dedicated `/receive` screen with chain selector, address, QR, copy action, and network warning
- Wallet dashboard improvements for receive/send/history/settings actions, view-only send disabling, balance refresh, and dashboard-level hidden-balance toggle
- Contacts page now validates EVM addresses and is wired for send-flow contact selection
- View-only wallet creation now validates EVM addresses before profile creation
- Send flow now supports form → gas estimate → review → final confirmation → submitted/error behavior with native and ERC-20 assets
- Safety mode continues to block real mainnet sends by default until explicitly disabled in settings
- Submitted transactions show tx hash, explorer link, and status refresh
- History page shows explorer links, chain labels, timestamps, and per-record refresh
- Settings page now uses curated autolock options, guarded safety-mode disablement, and typed `DELETE` confirmation for local vault removal
- Practice wallet now stores onboarding progress in the backend and remains fully off-chain

## Screens

- `/`
- `/create`
- `/import`
- `/unlock`
- `/wallet`
- `/receive`
- `/send`
- `/history`
- `/contacts`
- `/settings`
- `/view-only`
- `/practice`

## Wallet-core changes

- Added stable `deriveEvmAccountFromMnemonic()`
- Added explorer URL builders
- Added native/ERC-20 fee estimation helpers
- Strengthened address validation through `viem`
- Added version-aware encrypted-vault parsing with explicit unsupported-version error handling

## Backend/API changes

- API client expanded with typed `listChains`, `listTokens`, `getOnboardingProgress`, and `setOnboardingProgress`
- API error parsing is more user-friendly on the web client
- Backend routes now explicitly reject sensitive fields such as `mnemonic`, `privateKey`, and `passcode`
- Shared/package build hooks were added so dependent package test/build commands use fresh workspace artifacts

## Safety mode

- Safety mode remains enabled by default
- Real local-wallet sends stay blocked while safety mode is enabled
- Disabling safety mode requires an explicit user action in settings
- Final send confirmation still requires a real-funds acknowledgement checkbox

## View-only behavior

- View-only wallets can open dashboard, balances, receive, and history
- View-only wallets cannot send
- View-only creation validates the public EVM address before saving

## Practice mode behavior

- Practice mode never creates a real seed phrase or private key
- Practice balances and transactions remain simulated
- Practice onboarding progress is persisted through the backend

## Transaction flow

1. User selects chain, asset, recipient, and amount
2. App validates wallet state and recipient
3. App estimates gas/network fee
4. User reviews network, addresses, asset, amount, and fee
5. Final confirmation submits either a real signed tx or a practice record
6. Backend stores a transaction record and status can be refreshed later

## Tests

- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## VPS deployment

- Source bundle uploaded to `/opt/acorus-wallet`
- `api` and `web` rebuilt on VPS
- Public and loopback `/health` and `/api/chains` checks passed
- Persistence create+verify passed before and after `restart api`
- Public HTML route fetches succeeded for `/`, `/send`, `/receive`, `/view-only`, and `/practice`

## Known limitations

- Current public access still uses raw `IP:8080`
- Domain and HTTPS are intentionally postponed
- SSH hardening and root-password hardening are intentionally postponed
- Real mainnet send remains blocked by default through safety mode
- Solana, Tron, NFT, WalletConnect, dApp browser, and swaps are out of scope for this wave
- Local Docker compose config is valid, but full local container regression remains blocked on this workstation while `dockerDesktopLinuxEngine` is unavailable

## Next wave

- Browser-level automated E2E for create/import/unlock/send when a stable Playwright/browser path is added
- Mobile-specific unlock biometrics and secure keystore integration
- Additional chain families and richer asset surfaces only after the EVM MVP remains stable
