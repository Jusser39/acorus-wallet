# Chrome Extension Architecture Skeleton Report

## Status: Implemented, Validated

## What was built
- `apps/extension` added as a new workspace package
- Manifest V3 skeleton generated into `apps/extension/dist/manifest.json`
- `src/background/index.ts` adds a safe runtime message router
- `src/content/index.ts` injects the inpage stub and bridges page messages to the background
- `src/inpage/index.ts` exposes `window.acorus` as a stub-only provider
- `src/popup/index.ts` and `src/options/index.ts` render architecture/safety shells
- `src/shared/protocol.ts` defines message bus, permission model, extension phases, and skeleton state helpers
- `src/background/permission-store.ts` adds a storage-backed connected-sites placeholder

## Safety guarantees
- No live account access
- No WalletConnect
- No `window.ethereum` runtime compatibility
- No signing or broadcasting
- No mnemonic/privateKey/passcode handling
- All non-ping provider methods remain disabled

## Checks
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## Runtime impact
- No web or API runtime behavior changed in production
- No VPS redeploy required for this wave because the extension skeleton is repository-only

## Next step
- Universal dApp Session / Permission Shell, or extend the new extension skeleton with popup prompts and queued permission requests before enabling any real site connectivity
