# Universal dApp Live Bridge Plan

## Goal

Activate the first real browser-runtime bridge for dApps on top of the existing
permission shell without enabling signing, transaction broadcast, WalletConnect,
or wallet-backed secret exposure.

## Scope

1. Extend the shared dApp contract with origin bridge state:
   - connection status
   - provider exposure mode
   - active chain
   - live origin snapshot
2. Upgrade the extension runtime so pages can use:
   - `acorus_requestAccounts`
   - `acorus_accounts`
   - `acorus_chainId`
   - `acorus_switchChain`
3. Keep all account exposure preview-backed only
4. Keep sign/send methods explicitly disabled
5. Reflect the live preview bridge honestly in web and extension UI

## Safety boundaries

- No mnemonic, seed, privateKey, or passcode exposure
- No signing output
- No transaction broadcast
- No WalletConnect pairing
- No silent approvals
- Every origin must still pass through the approval/session registry

## Exit criteria

- A webpage can request connection through the extension bridge
- Approval creates an origin-bound active session
- Approved pages can read preview-backed accounts and active chain
- Approved pages can request a chain switch only within approved chain scope
- Sign/send methods still return explicit disabled/not-enabled responses
