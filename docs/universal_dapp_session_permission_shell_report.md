# Universal dApp Session / Permission Shell Report

## Outcome

The universal dApp shell now exists as a shared preview contract across web and
extension surfaces. Acorus Wallet can render connection proposals, connected
sites, permission scopes, approval history, request queue, and revoke controls
without enabling any live provider connectivity.

## What shipped

### Shared domain layer

- Added `packages/shared/src/dapp.ts`
- Added canonical types for:
  - `DappSessionProposal`
  - `DappSession`
  - `DappRequest`
  - `DappPermissionScope`
  - `DappApprovalResult`
  - `DappShellSnapshot`
- Added shared reducers for:
  - approve proposal
  - reject proposal
  - approve request
  - reject request
  - revoke session

### Wallet-core adapter metadata

- Added `dapp` capability to the adapter contract
- Marked current adapters honestly as `dapp: false` until live connectivity
  exists

### Web product shell

- Replaced the old `/dapps` placeholder with a real preview shell
- Added interactive preview controls for:
  - connection proposals
  - pending request queue
  - connected sites
  - recent approval decisions
  - permission model reference
- Updated wallet product metadata so dApps are now shown as `Preview`

### Extension shell

- Upgraded background storage from a simple connected-sites placeholder to a
  full preview dApp shell snapshot
- Popup and options now expose:
  - proposal approve/reject actions
  - request approve/reject actions
  - session revoke action
  - recent approval history
- Provider injection remains stub-only

## Safety status

- No live site connectivity
- No WalletConnect
- No account exposure to real sites
- No signing output
- No transaction broadcast
- No mnemonic/privateKey/passcode handling outside the client vault boundary

## Follow-up

The next dApp wave should activate real provider bridging behind the same
shared contracts instead of inventing a separate runtime model.
