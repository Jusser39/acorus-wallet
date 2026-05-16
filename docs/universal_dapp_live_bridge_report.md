# Universal dApp Live Bridge Report

## Outcome

Acorus Wallet now has a live preview-backed dApp bridge inside the extension
stack. Approved origins can use the internal provider for connect, accounts,
active chain, and switch-chain flows, while signing and transaction execution
remain blocked.

## What shipped

### Shared domain updates

- Extended `packages/shared/src/dapp.ts` with:
  - `DappBridgeConnectionStatus`
  - `DappProviderExposureMode`
  - `DappBridgeSessionView`
  - origin proposal helpers
  - active-chain mutation helpers
  - origin bridge snapshot helpers

### Extension runtime updates

- Background now routes live preview-backed methods:
  - `acorus_requestAccounts`
  - `acorus_accounts`
  - `acorus_chainId`
  - `acorus_switchChain`
- `requestAccounts` creates an approval-required proposal when no active session exists
- Content script now syncs origin bridge state into the page
- Inpage provider now tracks:
  - connection state
  - approved accounts
  - active chain
  - state/account/chain change events

### Product shell updates

- `/dapps` now describes the bridge as live in preview-backed mode
- `/extension` now documents which provider methods are live and which remain blocked
- Extension popup/options now show active origin bridge state in addition to proposals and sessions

## Safety status

- Connect/accounts/chainId/switchChain only
- Preview-backed accounts only
- No wallet-backed signing
- No transaction broadcast
- No WalletConnect
- No backend custody changes

## Follow-up

The next dApp wave should add signing review and transaction-request approval on
top of this already-active connect/runtime bridge.
