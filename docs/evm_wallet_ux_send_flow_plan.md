# EVM Wallet UX + Send Flow Plan

## Current status

- Public dev/staging deployment is live at `http://85.239.59.199:8080`
- Backend store is `prisma`
- Web already has screens for landing, create, import, unlock, wallet, send, history, contacts, settings, view-only, and practice
- Local encrypted vault already exists and is stored in browser storage
- Zustand store already keeps `userId`, encrypted vault, unlocked vault, active wallet profile, selected chain, safety mode, and autolock timeout
- API already persists wallet profiles, contacts, transaction records, onboarding progress, and curated token metadata
- Current send flow is functional only as a lightweight skeleton and needs product-level UX, safety, validation, and transaction-state improvements

## This wave will implement

1. Shared types cleanup for EVM wallet/send primitives
2. Wallet-core improvements for EVM account derivation, explorer helpers, gas estimation, send helpers, and safe error handling
3. Version-aware local vault service for encrypted vault, active wallet profile id, and local settings
4. Stronger wallet session state for lock/unlock/autolock and active profile behavior
5. Improved create/import/unlock flows with better validation and clearer UX
6. Dashboard improvements for address, QR receive, chain switching, balance refresh, hidden balances, and wallet-type states
7. Dedicated receive flow
8. Contact validation and send-from-contact UX
9. Full send flow with form → gas estimate → review → final confirmation → submitted/error
10. Safer mainnet blocking through safety mode by default
11. Transaction history/status refresh improvements
12. Settings improvements for autolock, safety mode, wallet profile preferences, and danger zone UX
13. Better view-only and practice wallet behavior
14. Tests, docs, and VPS rollout validation for the wave

## This wave will not implement

- Solana
- Tron
- NFT send/display/burn
- WalletConnect
- dApp browser
- swap or cross-chain swap
- social/explore features
- domain/HTTPS
- SSH hardening
- root password rotation
- firewall changes
- backend seed/private-key/passcode storage

## User flows

### Landing
- User sees entry points for create, import, view-only, and practice wallet

### Create wallet
- Generate mnemonic locally
- Show seed phrase with explicit backup acknowledgement
- Ask for passcode and confirm passcode
- Encrypt vault locally
- Create anonymous user if missing
- Create backend wallet profile with public address only
- Save encrypted vault locally and enter unlocked session

### Import wallet
- Paste mnemonic locally
- Validate mnemonic
- Ask for passcode and confirm passcode
- Encrypt vault locally
- Create/update backend wallet profile with public address only
- Clear sensitive form state after success

### Unlock / lock / autolock
- Unlock decrypts vault only in memory
- Manual lock clears decrypted state
- Autolock clears decrypted state after timeout / hidden-tab return

### Dashboard
- Show active wallet name, wallet type, address, copy, receive QR, chain selector, native balance, token balances, hidden-balance toggle, and quick actions

### Receive
- Show selected network, address, QR, copy action, and network mismatch warning

### Contacts
- CRUD contacts through backend
- Validate EVM addresses on EVM entries
- Reuse contacts directly in send flow

### Send
- Validate wallet state and recipient
- Estimate gas
- Show review screen
- Require final confirmation
- Block real mainnet send while safety mode is enabled
- Save tx record after submit/fake submit
- Show tx hash and explorer link

### History
- Load tx records from backend
- Refresh pending statuses
- Distinguish practice vs real-chain behavior

### Settings
- Update wallet name, hidden balance, preferred currency, autolock, and safety mode
- Manual lock
- Clear local vault in danger zone

### View-only
- Create profile from public EVM address
- Balance/history/receive available
- Send disabled everywhere

### Practice
- No real seed or key
- Fake balances, fake send, fake history, onboarding lessons

## Wallet states

- `no_wallet`
- `local_locked`
- `local_unlocked`
- `view_only`
- `practice`
- `sending_review`
- `sending_submitted`
- `sending_error`

## Security boundaries

- Mnemonic, seed phrase, passcode, and private-key material never go to backend
- Decrypted mnemonic exists only in runtime memory while unlocked
- Local storage contains only encrypted vault and non-sensitive UI/session references
- Review screen is mandatory before send
- View-only wallet never signs
- Practice wallet never uses a real signing key
- Safety mode stays enabled by default and blocks real mainnet send until explicitly disabled

## Backend boundaries

- Backend stores only public address, wallet profile metadata, contacts, tx records, onboarding progress, chain config, and curated token metadata
- Backend must not accept mnemonic/privateKey/passcode fields in wallet flows
- API remains same-origin through nginx on `:8080`

## Testing plan

- wallet-core unit tests for mnemonic/vault/address/explorer/gas/send helpers where feasible
- API tests for anonymous user, wallet profiles, contacts, transactions, onboarding, and safe request behavior
- web unit tests for storage/session/safety-mode/view-only behavior
- manual VPS checks for create/import/unlock/dashboard/send-to-safety-block/history/view-only/practice
- persistence regression after deploy with `scripts/check-persistence.sh`

## Deployment plan

1. Implement types, wallet-core, storage, state, and UI changes locally
2. Run local test/build checks
3. If local Docker engine is available, run compose regression locally
4. Sync changed files to `/opt/acorus-wallet`
5. Rebuild `api` and `web` on VPS
6. Re-run health + persistence checks
7. Do manual browser/UI walkthrough on public URL
