# Universal Swap Extension Review Plan

## Goal

Move the swap stack one step closer to a real multichain wallet by letting Jupiter and Rango routes reach the Acorus extension approval surface, while keeping execution gated until route-specific transaction decoding and signing are reviewed.

## Scope

- Keep 0x EVM execution unchanged.
- Add Jupiter and Rango review cards to extension approvals.
- Keep provider keys on the backend only.
- Do not expose raw Jupiter transaction blobs, Rango transaction payloads, mnemonics, passcodes, private keys, or signing payloads in UI cards, storage, docs, or API bodies.
- Do not enable automatic Solana/cross-chain execution in this wave.

## Implementation Shape

- Extend shared dApp review details with `universal_swap`.
- Extend extension protocol with `queue_universal_swap_approval` for popup/options use.
- Allow Acorus web to queue Jupiter/Rango reviews through the existing `acorus_swap` provider method.
- For non-0x swap payloads, extension approval returns an approved preview result instead of broadcasting.
- Add popup rendering for review-only Jupiter/Rango cards.

## Validation

- Build shared, extension, and web packages.
- Add regression coverage for extension review cards and web route-review controls.
- Run full local checks before commit/package/deploy.

## Known Limitations

- Jupiter execution requires audited Solana transaction decoding and signer checks.
- Rango execution requires per-chain route validation and explicit wallet adapter support.
- Cross-chain execution remains disabled.
