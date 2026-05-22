# Wallet Lock Repair Flow Report

## Problem

The wallet app could show `Unlock wallet` even when a user had not created a passcode. This happened when profile state existed without a matching valid encrypted vault in local browser storage.

## Fix

- Added `resolveWalletVaultUiState()` in `apps/web/lib/wallet-vault-state.ts`.
- Added `acorus.vaultMeta` to mark newly saved encrypted vaults as passcode-initialized.
- Added `clearAcorusLocalWalletState()` to remove local wallet/vault/profile settings safely.
- Updated `/unlock` to render one of four states:
  - onboarding when no vault exists;
  - unlock when a real encrypted vault exists;
  - already-unlocked shortcut;
  - repair/reset for stale or corrupted local state.
- Updated `/wallet` so local profiles without a valid vault render a repair card instead of a locked-wallet CTA.

## User Recovery Path

If the user never created a passcode, open `/unlock?repair=1`, type `RESET`, and reset local wallet state. This removes only local browser wallet state. Blockchain assets are not deleted, but restoring access requires the seed phrase backup.

## Security Boundary

The reset helper removes local browser keys such as encrypted vault metadata, local user id, active profile id, settings, and legacy decrypted session keys. It does not call backend secret endpoints and does not handle mnemonic/private key material.
