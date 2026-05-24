# Acorus Mage Redesign and Lock Fix Report

Date: 2026-05-24

## Implemented

- Web import now uses the same relaxed BIP-39 importability check as the
  extension, so valid 12/18/24 word phrases can be imported even when checksum
  status is handled separately by wallet-core.
- Web create/import now refuses to encrypt a wallet until the user explicitly
  chooses PIN or generated/random password setup.
- The extension import flow is covered by a regression test for the user's
  supplied 12-word test phrase.
- The extension install CTA in the swap composer now opens the extension setup
  route instead of being a dead button.
- Added `AcorusMagicStage` as the reusable Guardian stage for home, swap, wallet,
  security, and future page-specific poses.
- Reworked the home page into a compact Magic Glass wallet/trading dashboard with
  portfolio, swap, Guardian stage, discovery, and Fear & Greed panels.
- Reworked `/swap` so the real composer is the primary surface and the Guardian
  stage becomes a supporting visual module.
- Updated `/wallet` repair/empty/locked/active states to use the Magic Glass
  layout and send stale-password users to the explicit reset flow.

## Validation

- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/web build`

## Recovery Note

An already encrypted wallet cannot have its passcode removed without decrypting
the vault. The supported recovery path is local reset plus re-import:

1. Open `/unlock?repair=1`.
2. Type `RESET`.
3. Import the seed phrase again.
4. Choose PIN or generated/random password explicitly.

## Remaining Work

- Run the full workspace validation suite after this report.
- Browser-smoke the updated pages and extension popup after deployment.
- Replace the code-native Guardian fallback with final WebP/AVIF character poses
  when approved visual assets are available.
