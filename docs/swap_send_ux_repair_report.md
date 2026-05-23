# Swap and Send UX Repair Report

Date: 2026-05-23

## Scope

- Fixed the public extension install CTA so it downloads the packaged Chrome extension instead of acting as a dead button.
- Reworked the swap composer token selection into a Uniswap-style picker with search, quick chips, and network-aware popular tokens.
- Moved the real swap composer to the top of `/swap` and removed the obsolete marketing/mock hero from that page.
- Hid raw Jupiter/Rango route debug forms from the public swap UI while preserving backend route plumbing for reviewed future execution.
- Replaced the decorative Market pulse bar chart on the home scene with a Fear & Greed style market breadth meter.
- Repaired unreadable send/review cards by replacing dark slate blocks with light Magic Glass review cards.

## Validation

- `pnpm --filter @acorus/web test` passed.
- `pnpm --filter @acorus/web build` passed.
- `git diff --check` passed.
- `pnpm build` passed.
- `pnpm extension:package` passed.
- `pnpm test` passed.
- Local browser smoke on `http://127.0.0.1:3010/` confirmed the Guardian scene and Fear & Greed card.
- Local browser smoke on `http://127.0.0.1:3010/swap` confirmed the composer-first layout, working extension zip link, and token picker.

## Known Limitations

- This wave does not add new transaction execution paths beyond the already reviewed flows.
- Jupiter and Rango route execution remains gated until transaction decoding and extension approval execution are fully reviewed.
- Browser/production smoke still needs to be run after deployment.
