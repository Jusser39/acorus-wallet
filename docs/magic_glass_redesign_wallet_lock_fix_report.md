# Magic Glass Redesign + Wallet Lock Fix Report

## Implemented

- Added a wallet vault state machine and regression tests for empty, locked, unlocked, stale local profile, missing passcode marker, and legacy encrypted vault states.
- Added explicit vault metadata persistence for newly created/imported local web vaults.
- Added a local wallet reset helper and repair UI.
- Reworked `/unlock` into a Magic Glass onboarding, unlock, repair, and already-unlocked flow.
- Added a wallet repair card to `/wallet` when stale local profile state is detected.
- Added global Magic Glass tokens, panels, nav, buttons, orb, floating token chips, and readability overrides.
- Reworked the home page into a Magic Glass wallet/trading hero with portfolio, embedded swap composer, floating asset stage, trending rows, and safety copy.
- Updated global navigation and `/design-system` to match the new visual language.

## Validation

- `pnpm --filter @acorus/web test -- wallet-vault-state reset-local-wallet storage design-system-page`
- `pnpm --filter @acorus/shared test`
- `pnpm --filter @acorus/wallet-core test`
- `pnpm --filter @acorus/api test`
- `pnpm --filter @acorus/extension lint`
- `pnpm --filter @acorus/extension test`
- `pnpm --filter @acorus/web test`
- `pnpm --filter @acorus/shared build`
- `pnpm --filter @acorus/wallet-core build`
- `pnpm --filter @acorus/api build`
- `pnpm --filter @acorus/extension build`
- `pnpm --filter @acorus/web build`
- `pnpm build`
- `git diff --check`
- `pnpm extension:package`

`pnpm test` was also attempted from the repository root in this Windows
desktop session. It hung without useful output, while the same workspace test
suites passed when run package-by-package.

## Local Browser Smoke

- `/`
- `/wallet`
- `/unlock?repair=1`
- `/design-system`
- Mobile home viewport

Screenshot artifacts were generated locally under `artifacts/screenshots/` and
are intentionally ignored by git.

## Production Deploy

- Commit deployed: `f1bd66fab17ebe5aa784fe4127b90664ad5255bc`
- Release path: `/opt/acorus-wallet-release-current`
- Backup path: `/root/backups/acorus-magic-glass-lock-fix_20260523_004344`
- Rebuilt/recreated services: `api`, `web`, `nginx`
- Production checks passed:
  - `https://24wallet.ru/health`
  - `https://24wallet.ru/wallet`
  - `https://24wallet.ru/unlock?repair=1`
  - `https://24wallet.ru/design-system`
  - `https://24wallet.ru/extension-smoke`
  - `https://24wallet.ru/downloads/acorus-wallet-extension.zip`
  - `https://24wallet.ru/api/swap/status`
- Browser smoke passed for production `/unlock?repair=1` and `/`.

## Known Limitations

- This wave does not add new swap execution paths.
- Jupiter and Rango remain review-only/gated where existing adapters require it.
- A real Chrome extension import/swap smoke still needs manual browser confirmation after deployment.
