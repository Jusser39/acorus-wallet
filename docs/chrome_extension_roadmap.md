# Chrome Extension Roadmap

## Goal
Turn Acorus Wallet into a browser extension that can connect to Web3 websites
like MetaMask, Trust Wallet, or Uniswap Extension.

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
- optional `window.ethereum` compatibility later
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
- `wallet_switchEthereumChain`
- `personal_sign`
- `eth_signTypedData_v4`
- `eth_sendTransaction`

### Phase 3: Solana compatibility
- `connect`
- `disconnect`
- `signMessage`
- `signTransaction`
- `signAllTransactions`

### Phase 4: WalletConnect
- `pair`
- `session proposal`
- `session request`
- `sign` and `broadcast` routing

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
This roadmap does not implement extension yet. It prepares architecture only.
