# Acorus Mage Redesign and Lock Fix Plan

Date: 2026-05-24

## Goals

- Stop accidental or legacy passcode states from trapping users behind an unlock
  keypad.
- Require explicit user choice before a web or extension wallet is encrypted:
  numeric PIN or generated/random password.
- Keep the existing 0x, Jupiter, Rango, EVM, Solana, and extension approval
  plumbing intact.
- Move the web surface toward the Acorus Guardian / Magic Glass direction:
  compact glass panels, cyan-violet-pink glow, a reusable mascot stage, and
  readable wallet/trading controls.

## Lock-State Scope

- Treat a vault as locked only when encrypted vault data exists and metadata
  proves passcode setup was explicitly confirmed.
- Treat markerless/stale vaults as repair/reset cases.
- Provide a reset path that clears local encrypted vault state only after an
  explicit confirmation phrase.
- Do not attempt to remove or recover an unknown passcode from an encrypted
  vault; that would require decrypting the vault first.

## Design Scope

- Add a reusable Acorus Guardian stage component with an orb/mascot fallback and
  floating asset chips.
- Rework the home page into a compact wallet/trading shell using the Magic Glass
  visual system.
- Make `/swap` use the real composer as the primary surface instead of a mock.
- Improve `/wallet` states so empty, repair, locked, and active screens share the
  same visual language.
- Keep debug/provider implementation details out of the main user surface.

## Acceptance Criteria

- Web create/import refuses to continue until the user explicitly chooses and
  confirms a PIN or generated/random password.
- Existing markerless local vaults show repair/reset instead of a keypad.
- Extension create/import accepts valid 12/18/24 word import phrases and asks
  for explicit passcode setup.
- The supplied test phrase is covered by wallet-core and extension tests.
- `/`, `/wallet`, `/swap`, and `/create` build with readable Magic Glass UI.
