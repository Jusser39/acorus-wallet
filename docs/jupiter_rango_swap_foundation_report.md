# Jupiter and Rango Swap Foundation Report

Date: 2026-05-21

## Goal

Add a safe backend-backed foundation for more swap routes without exposing provider keys to the web app or Chrome extension.

## Implemented

- Added shared swap types for `0x`, `jupiter`, and `rango` provider status, quote, and transaction-draft payloads.
- Added backend Jupiter proxy routes for Solana quote and transaction draft requests.
- Added backend Rango proxy routes for cross-chain quote and transaction draft requests.
- Added a universal `/api/swap/status` route that reports provider availability without exposing API keys.
- Added validation, rate limiting, 8 second provider timeouts, and safe error mapping for Jupiter and Rango.
- Updated the web swap composer to show `0x`, Jupiter, and Rango provider cards, with quote/draft controls for the new providers.
- Updated the create-wallet page into an extension-first flow and kept the legacy local web vault behind an explicit fallback disclosure.
- Reduced noisy token-page live/source badges and kept the right-side swap surface visible.
- Polished extension popup asset rows so token logos can render and technical balance-source strings are hidden from normal users.

## Security Boundary

- Provider API keys are read only from backend environment variables.
- No Jupiter, Rango, or 0x API key is committed or bundled into frontend/extension code.
- Seed phrase, private key, passcode, and signing payload material are not sent to swap provider APIs.
- Jupiter and Rango transaction payloads are treated as drafts until a later explicit wallet approval/execution integration.

## Validation

- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core build`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- `pnpm extension:package`

## Local Smoke

- `/api/swap/status` returned `0x`, `jupiter`, and `rango` provider entries without leaking any API key.
- `/create` rendered the extension-first wallet creation flow with readable fields and safety copy.
- The Bitcoin token page hydrated real token detail, showed one Blockchain action, kept the right-side swap panel visible, and rendered live market metrics after the local API proxy responded.

## Known Limitations

- Jupiter and Rango are wired as backend quote/transaction-draft foundations in this wave; extension execution approval for those drafts is the next step.
- 0x remains the only reviewed EVM execution path.
- Jupiter and Rango require production env values before live provider calls are configured.
- Automated Chrome extension import/swap smoke was not completed in this environment because the in-app browser did not load the unpacked extension profile.
