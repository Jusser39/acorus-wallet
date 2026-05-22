# Acorus Magic Glass Redesign + Wallet Lock Fix Plan

## Context

The previous premium shell established a white/purple UI layer, but the wallet pages still had mixed legacy surfaces and the wallet dashboard could show an unlock state for a user who had never created a passcode.

## Root Cause

`apps/web/app/wallet/page.tsx` treated any local wallet profile without an active in-memory `unlockedVault` as locked. A stale local profile, corrupted vault, or missing encrypted vault therefore rendered an unlock path even when no valid passcode setup existed.

The web vault storage also had no explicit metadata marker that distinguished a real encrypted/passcode-initialized vault from stale or legacy browser state.

## Scope

- Add an explicit wallet vault UI state resolver: empty, locked, unlocked, repair required.
- Add vault metadata for newly saved encrypted vaults.
- Add a reset local wallet state helper and UI path for stale/corrupted browser state.
- Redesign the home, unlock, wallet repair, global nav, and design-system reference page with the new Acorus Magic Glass style.
- Keep signing, seed handling, swap execution, extension approvals, and chain adapters unchanged.

## Non-Scope

- No automatic real swaps.
- No seed/private key/passcode transfer to backend.
- No new Jupiter/Rango execution.
- No WalletConnect execution changes.

## Acceptance Criteria

- A browser with no encrypted vault does not see a passcode keypad.
- A stale local profile without a vault shows repair/reset, not unlock.
- Valid initialized vaults still show unlock.
- Reset local wallet state clears only browser wallet data and forces a clean bootstrap.
- `/`, `/unlock`, `/wallet`, and `/design-system` use the same readable Magic Glass palette.
- Focused tests and production web build pass.
