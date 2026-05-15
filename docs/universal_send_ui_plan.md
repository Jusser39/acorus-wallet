# Universal Send UI Plan

## Current status
Wave 3 added Universal Send Draft Engine. It can create drafts for EVM and disabled/skeleton drafts for non-EVM adapters. The old EVM send page remains working.

## Product direction
Acorus Wallet must provide a single multichain send composer:
Network → Asset → Recipient → Amount → Draft Preview → Review.

## Scope
- Universal send UI types (`SendStep`, `SendAssetOption`, `SendNetworkOption`, `SendComposerState`)
- Network options service (`buildSendNetworkOptions`, `findSendNetworkOption`)
- Asset options service (`buildSendAssetOptions`, `buildFallbackNativeAsset`)
- Send wizard component (`SendComposer`)
- Non-EVM dead-end replaced with `SendComposer` in `/send` page
- EVM `/send` page keeps legacy form with `SendComposer` above as draft layer
- Wallet page CTA updated: non-EVM (non-view_only) profiles link to `/send`

## Non-scope
- Solana real broadcast
- Tron real broadcast
- BTC real broadcast
- Swap
- NFT
- WalletConnect
- dApp browser
- Domain/HTTPS/SSH hardening
- Backend seed/privateKey/passcode storage
- Full removal of legacy EVM send

## Safety
- Non-EVM adapters show honest "coming soon / skeleton" with amber warning
- Draft preview is NOT broadcast — no funds move
- Backend never receives seed/privateKey/passcode
- Old EVM send path remains working and intact
- `canNetworkBroadcast()` guards all broadcast-related UI

## Implementation phases (completed)
1. ✅ `apps/web/lib/send-ui.ts` — types + helpers
2. ✅ `apps/web/lib/send-networks.ts` — network options builder
3. ✅ `apps/web/lib/send-assets.ts` — asset options builder with fallback
4. ✅ `apps/web/components/send-composer.tsx` — main wizard UI
5. ✅ `apps/web/app/send/page.tsx` — non-EVM block replaced; EVM gets composer header + bridge
6. ✅ `apps/web/app/wallet/page.tsx` — send CTA enabled for non-EVM non-view_only
7. ✅ Tests: send-ui.test.ts, send-networks.test.ts, send-assets.test.ts (19 new tests)
8. ✅ Build clean (18 routes), all 49 web tests pass
9. ✅ VPS deployed, health/persistence verified

## Known risks (mitigated)
- Breaking old EVM send → wrapped under `#evm-send-form` anchor, not deleted
- Asset selector mismatch → `buildFallbackNativeAsset` fallback when portfolio null
- Confusing disabled networks with live sends → amber warning + `canNetworkBroadcast()` gate
- EVM portfolio missing `family` field → handled with `effectiveFamily` fallback in filter
