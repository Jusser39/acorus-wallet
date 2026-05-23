# Wallet Account Menu and Preferences Report

Date: 2026-05-23

## Scope

This wave turns the inert top-right wallet badge into an interactive account menu and adds user-facing preference controls for currency, language, translation, privacy, and activity display.

## Changes

- Replaced the static wallet badge in the web header with a click-to-open wallet account menu.
- Added wallet quick actions:
  - copy address
  - send
  - receive
  - view portfolio
  - recent activity
  - settings
  - history
- Added an embedded settings view inside the wallet menu.
- Added application preferences:
  - theme: auto, light, dark
  - display currency with a broad currency list
  - preferred language
  - Google Translate link for the current page
  - analytics toggle
  - hide small balances
  - hide unknown tokens
  - hide flagged activity
- Reworked the `/settings` page to use the same preferences and a clearer wallet-like settings layout.
- Extended local settings persistence so preferences survive reloads without touching secret wallet material.

## Security Notes

- No seed phrase, private key, passcode, signing payload, provider key, or server credential is sent to the backend by these settings.
- Preferences are non-secret UX state stored locally in browser storage.
- The Google Translate link sends only the current public page URL to Google Translate; it does not include wallet secrets.

## Validation

Passed locally:

- `pnpm --filter @acorus/web test -- app-preferences storage wallet-store`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `pnpm extension:package`

Browser smoke:

- Opened `/wallet` locally.
- Clicked the top-right wallet badge.
- Confirmed the account menu opens.
- Confirmed the menu exposes send, receive, portfolio, copy address, recent activity, settings, and history controls.
- Confirmed the embedded settings view shows theme, currency, language, Google Translate, analytics, and balance/activity privacy toggles.

## Production Deployment

- Commit: `a054950` (`Add wallet account menu and preferences`)
- Release path: `/opt/acorus-wallet-release-current`
- Server backup: `/root/backups/acorus-wallet-menu-preferences_20260523_231012`
- Rebuilt/recreated services: web and nginx

Production checks passed:

- `https://24wallet.ru/health`
- `https://24wallet.ru/wallet`
- `https://24wallet.ru/settings`
- `https://24wallet.ru/downloads/acorus-wallet-extension.zip`

Production browser smoke passed for `/wallet`: the top-right wallet account menu opens, exposes the requested wallet actions, and the nested settings view exposes currency, language, Google Translate, analytics, and balance/activity privacy toggles.

## Known Limitations

- Google Translate is implemented as a safe external link, not as an embedded third-party script, to avoid injecting another script into the wallet surface.
- Recent activity still depends on the existing local activity/event sources; this wave adds the menu surface, not a new indexer.
- Display currency changes are persisted for UX, but market data conversion is still limited by backend-supported quote currencies where live conversion is needed.
