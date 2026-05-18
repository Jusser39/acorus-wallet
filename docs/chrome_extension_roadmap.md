# Chrome Extension Roadmap

## Goal
Turn Acorus Wallet into a browser extension that can connect to Web3 websites
like MetaMask, Trust Wallet, or Uniswap Extension.

## Current status
- `apps/extension` now exists in the repository as a Manifest V3 architecture skeleton
- current surfaces: background, content, inpage, popup, options
- preview permission shell is now implemented for proposals, connected sites, request queue, and revoke actions
- live preview-backed bridge is now active for `acorus_requestAccounts`, `acorus_accounts`, `acorus_chainId`, and `acorus_switchChain`
- preview-backed `window.ethereum` compatibility is now active for common EVM wallet methods
- preview-only WalletConnect pairing records can now be queued from the extension options shell with immediate secret redaction
- preview-only multichain session requests can now be queued for approved peers so WalletConnect and injected transports share one follow-up review queue
- real EVM signing output and transaction broadcast now execute inside the extension after a second signer confirmation; live WalletConnect relay and non-EVM provider execution are still disabled

## Why extension matters
A wallet becomes useful across crypto websites when it can:
- inject a provider into pages
- receive connection requests
- show permission prompts
- sign messages
- sign transactions
- switch networks
- expose accounts
- manage connected sites

## Extension architecture

Future packages:

```text
apps/extension/
  manifest.json
  src/background/
  src/content/
  src/inpage/
  src/popup/
  src/options/
  src/shared/
```

Core parts:

### 1. Background service worker
Responsible for:
- sessions
- permissions
- request routing
- vault access coordination
- network state
- transaction queue

### 2. Content script
Responsible for:
- isolated bridge between webpage and extension
- relaying messages

### 3. Inpage provider
Responsible for:
- `window.acorus`
- preview-backed `window.ethereum` compatibility
- `request({ method, params })`

### 4. Popup UI
Responsible for:
- wallet dashboard
- connect prompt
- sign prompt
- transaction review
- network switch prompt

### 5. Permission store
Responsible for:
- connected sites
- approved accounts
- chain permissions
- session expiry

## Provider API phases

### Phase 1: Internal provider
- `acorus_requestAccounts`
- `acorus_accounts`
- `acorus_chainId`
- `acorus_switchChain`

### Phase 2: EVM compatibility
- `eth_requestAccounts`
- `eth_accounts`
- `eth_chainId`
- `net_version`
- `eth_coinbase`
- `wallet_switchEthereumChain`
- `personal_sign`
- `eth_signTypedData_v4`
- `eth_signTransaction`
- `eth_sendTransaction`

### Phase 3: Solana compatibility
- `connect`
- `disconnect`
- `signMessage`
- `signTransaction`
- `signAllTransactions`

### Phase 4: WalletConnect preview shell
- `pair` via pasted URI
- redacted `session proposal`
- connected peer registry
- live relay, `sign`, and `broadcast` routing later

### Phase 5: Multichain session request shell
- queue preview follow-up requests for approved peers
- keep transport/account/chain context visible
- reuse the same approval queue for injected sites and WalletConnect peers
- real client-side sign and broadcast execution later

### Phase 6: Signer unlock + EVM execution layer
- move approved requests from the generic queue into a dedicated signer-confirmation gate
- require explicit extension-side confirmation before any signature or transaction result returns to the dApp
- keep pending signing material, mnemonic, and private key inside the extension boundary only
- execute supported EVM sign/send methods inside the extension only after confirmation
- keep WalletConnect relay and non-EVM provider execution for later waves

## Safety requirements
- No private key in content script
- No seed in webpage
- No direct provider access to vault
- Every dApp action requires permission
- Every transaction requires review
- Origin shown clearly
- Spending approvals require warnings
- Suspicious contracts flagged

## Not now
This roadmap now includes a live connect/runtime bridge, `window.ethereum`
compatibility, redacted WalletConnect pairing previews, multichain
session-request staging, a signer-confirmation gate, and real EVM
signing/broadcast execution inside the extension. It still does not implement
live WalletConnect relay or broader non-EVM provider execution.
