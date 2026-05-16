# Universal dApp Session / Permission Shell Plan

## Goal

Ship the first real universal dApp shell on top of the existing extension
foundation without enabling any live provider connectivity, signing, or account
exposure.

## Scope

1. Add shared domain types for:
   - dApp session proposals
   - connected sessions
   - permission scopes
   - request queue items
   - approval results
2. Extend adapter capability metadata with `dapp`
3. Replace placeholder dApp surfaces with a preview-ready session shell:
   - web `/dapps`
   - extension popup
   - extension options
4. Keep all behavior preview-only:
   - no live page connection
   - no WalletConnect
   - no signing output
   - no transaction broadcast
   - no backend sensitive data

## Product contract

- One universal dApp model across EVM, Solana, Tron, and future families
- Origin-bound permissions
- Account-scoped and chain-aware requests
- Explicit approve / reject / revoke controls
- Honest status labels when functionality is still preview-only

## Safety rules

- Backend never receives mnemonic, seed, privateKey, or passcode
- Extension/content/inpage surfaces never expose vault secrets
- Preview requests must never create real signatures or transactions
- Unsupported/live-disabled states must remain explicit

## Expected outputs

- `packages/shared/src/dapp.ts`
- `apps/web/components/dapp-session-shell.tsx`
- extension state store and queue actions
- updated docs and memory
