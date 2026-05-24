# Explicit Wallet Passcode Setup and Reset Report

Date: 2026-05-24

## Problem

Users could import or create a local wallet and later see an unlock keypad even
though they did not consciously choose a passcode. Older local vault metadata
also did not have a durable marker proving that password setup was explicitly
confirmed by the user.

## Root Cause

The web and extension vault flows treated any passcode value in the form as an
initialized wallet lock. That made stale or legacy local vault state look like a
valid locked wallet, even when there was no explicit passcode setup marker.

## Changes

- Added explicit web passcode setup with a modal question: numeric PIN or random
  password.
- Added passcode confirmation and a saved-password acknowledgement before web
  create/import can continue.
- Persisted `passcodeSetupConfirmedAt` and `passcodeMode` in web vault metadata.
- Updated wallet state resolution so vaults missing the explicit setup marker
  show repair/reset instead of the unlock keypad.
- Added extension vault metadata markers for explicit passcode setup.
- Added a popup reset action that clears only the extension-local encrypted
  vault state.
- Added extension create/import PIN/random password controls instead of relying
  on hidden or accidental values.
- Added tests for passcode policy, vault metadata, and stale marker handling.

## User Recovery

An encrypted vault password cannot be removed without decrypting that vault.
For users who never intentionally set a password, the safe recovery path is:

1. Open the repair/reset flow from `Forgot passcode or never created one?`.
2. Type `RESET` to clear only local wallet state in this browser.
3. Import the seed phrase again.
4. Choose the new PIN or random password manually in the explicit setup dialog.

Blockchain funds are not deleted by clearing local browser state, but the seed
phrase is required to restore access.

## Validation

- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/extension build`

## Known Limitations

- Existing encrypted vaults cannot be transparently migrated without the current
  passcode because the vault payload must remain encrypted.
- Users must reload the extension after installing a new build before the new
  popup controls are available.
