# Universal Send UI Report — Wave 4

## Summary
Wave 4 adds Universal Send UI / Multichain Send Composer to Acorus Wallet. A single wizard component now handles draft validation for any supported network, replaces the non-EVM dead-end screen, and bridges to the existing EVM send form.

## Files Created
| File | Purpose |
|------|---------|
| `apps/web/lib/send-ui.ts` | `SendStep`, `SendAssetOption`, `SendNetworkOption`, `SendComposerState`, helpers |
| `apps/web/lib/send-networks.ts` | `buildSendNetworkOptions()`, `findSendNetworkOption()` |
| `apps/web/lib/send-assets.ts` | `buildSendAssetOptions()`, `buildFallbackNativeAsset()` |
| `apps/web/components/send-composer.tsx` | Main wizard: network → asset → recipient → amount → draft → preview |
| `apps/web/lib/send-ui.test.ts` | 9 unit tests |
| `apps/web/lib/send-networks.test.ts` | 6 unit tests |
| `apps/web/lib/send-assets.test.ts` | 4 unit tests |
| `docs/universal_send_ui_plan.md` | Plan document |

## Files Modified
| File | Change |
|------|--------|
| `apps/web/app/send/page.tsx` | Non-EVM dead-end → `SendComposer`; EVM section gets `SendComposer` header + `#evm-send-form` anchor |
| `apps/web/app/wallet/page.tsx` | Send CTA enabled for non-EVM non-view_only profiles |
| `docs/project_memory.md` | Wave 4 appended |
| `docs/action_memory.md` | 8 new action entries |

## Architecture
```
/send page (any profile)
  ├── Non-EVM profile:
  │     └── <SendComposer> (full screen)
  │           ├── network selector → buildSendNetworkOptions()
  │           ├── asset selector → buildSendAssetOptions() w/ fallback
  │           ├── recipient + amount inputs
  │           ├── createUniversalSendDraft() → SendDraft
  │           ├── <SendDraftPreview>
  │           └── honest "coming soon / skeleton" state — no broadcast
  │
  └── EVM profile:
        ├── <SendComposer> (top — draft validation layer)
        │     └── EVM bridge link → #evm-send-form anchor
        └── Legacy EVM send form (bottom — real broadcast)

/wallet page
  ├── EVM profile → "Send" → /send (legacy EVM form)
  └── Non-EVM non-view_only → "Send draft" → /send (SendComposer)
```

## SendNetworkOption sendStatus mapping
| Family | Status |
|--------|--------|
| evm | `supported` |
| solana | `coming_soon` |
| tron | `skeleton` |
| utxo | `skeleton` |

## Test Results
- All 49 web tests pass (19 new tests for Wave 4 helpers)
- Build clean: 18 routes, TypeScript strict, no errors

## VPS Verification (2026-05-15)
- `docker compose ps`: api ✅ healthy, web ✅ up, nginx ✅ up
- `GET /health` → `{"status":"ok"}`
- `GET /api/chains` → EVM chains returned
- `HEAD /send` → HTTP 200
- `HEAD /` → HTTP 200
- Persistence after `restart api` → health OK, /send OK

## Commit
`feat: add universal send ui (Wave 4)`
