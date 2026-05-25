# UI Freeze and Extension Onboarding Fix Report

Date: 2026-05-25

## Goal

Stabilize the current Acorus web and Chrome extension experience after reports that the web UI could freeze Chrome, extension popup controls felt dead, and extension wallet import still surfaced browser alerts.

## Root Causes

- The web app marked wallet activity on high-frequency mouse movement and subscribed to broad wallet-store changes for local settings persistence. This could create excessive localStorage writes and re-renders while the user moved the mouse.
- Old service worker/cache state could keep serving stale UI after a new deploy or extension package rebuild.
- Extension wallet import could load wallet-core paths before the MV3 service worker had a Node-compatible `Buffer` global.
- Extension popup failures used blocking browser alerts/confirm dialogs instead of inline, wallet-native feedback.

## Changes

- Throttled wallet activity writes and removed `mousemove` from global activity tracking.
- Narrowed web settings persistence to a small preferences/profile snapshot instead of responding to every store update.
- Disabled the old web service worker path by unregistering existing registrations and clearing browser caches.
- Added pointer-event guards to decorative Magic Glass layers so animated/glass elements do not steal clicks from controls.
- Added a 12 second timeout to frontend API fetches so unavailable backend calls do not hang the UI.
- Made the top wallet lock button disabled and labelled `Locked` when no unlocked vault exists, instead of presenting a dead action.
- Loaded the extension `node-globals` shim before background asset/wallet modules so BIP-39 and HD derivation paths have `Buffer`.
- Replaced extension popup `alert`/`confirm` usage with inline success/warning/error notices and a two-step reset button.
- Rebuilt the downloadable Chrome extension package.

## Validation

Passed locally:

- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/web build`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension build`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm extension:package`
- `git diff --check`

Additional checks:

- Local dev server returned `200` for `http://127.0.0.1:3100/wallet`.
- Browser plugin validation was attempted, but the in-app browser was blocked by its current `data:` error-page navigation policy before it could open `127.0.0.1`.
- The rebuilt extension popup bundle no longer contains the old automatic-password/PIN/random onboarding strings.
- The rebuilt extension background bundle contains the `Buffer` compatibility path.

## Known Limitations

- A previously encrypted web or extension vault cannot have its password removed without decrypting it. If the password is unknown, the user must reset the local vault state and re-import from a backed-up seed phrase using a new user-chosen password.
- Real extension import/connect still requires manually reloading the freshly built unpacked extension or installing the rebuilt ZIP in Chrome.
- This pass did not execute a real swap transaction; swap execution remains gated behind extension review.

## Next Step

Run a manual Chrome smoke with the rebuilt extension: reset local extension vault, import a known test wallet, connect from `https://24wallet.ru`, verify account/menu controls, then reject and approve non-funding test approvals before attempting any funded swap.
