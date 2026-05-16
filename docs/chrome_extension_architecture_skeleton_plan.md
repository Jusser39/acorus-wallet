# Chrome Extension Architecture Skeleton Plan

## Goal
Add `apps/extension` as a safe Manifest V3 skeleton so Acorus Wallet can grow
into a browser extension without enabling live site connectivity yet.

## Scope
- `apps/extension` workspace package
- Manifest V3 scaffold
- background service worker skeleton
- content script bridge
- inpage provider stub
- popup shell
- options shell
- message bus and protocol types
- permission model types
- docs and memory updates

## Non-scope
- Live dApp connectivity
- WalletConnect
- `window.ethereum` compatibility runtime
- Account exposure
- Transaction signing
- Transaction broadcasting
- Approval management

## Safety
- No private key or seed in extension code paths
- No direct vault access from webpages
- Provider stub may exist, but all non-ping methods must stay disabled
- Permission model is type-level and storage-level only in this wave

## Validation
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm test`
- `pnpm build`
- `git diff --check`
