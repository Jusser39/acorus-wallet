# Solana Live Wallet MVP Report

Date: 2026-05-19

## Implemented

- Added Solana RPC timeout support in wallet-core.
- Added Solana explorer URL helpers.
- Added Solana amount parsing/formatting, send draft validation, and client-side signed SOL transfer execution.
- Added Solana message signing for the extension provider approval flow.
- Marked Solana extension capabilities as balance/send ready while keeping swap disabled.
- Extended extension portfolio snapshots to include live SOL and SPL balances with `live_solana_rpc` source labels.
- Added popup Solana send composer that queues an approval before execution.
- Added `multichain_send` approval details for safe popup review.
- Extended the injected Solana provider with `isConnected`, connect/disconnect events, and sign-message flow.
- Added Solana diagnostics to `/extension-smoke`.
- Updated web send policy/network status so Solana is no longer labeled coming soon.

## Tests Added Or Updated

- wallet-core Solana address, amount, explorer URL, and send draft tests.
- extension popup/source guards for Solana send queue and approval cards.
- web smoke harness test for Solana diagnostics.
- web send-policy and send-network tests for Solana supported status.

## Known Limitations

- SPL token transfer execution is not enabled yet; this MVP sends native SOL.
- Solana dApp compatibility is a supported subset, not Phantom-complete.
- Swap execution remains out of scope.
- Tron/BTC/TON send execution remains gated.

## Next Step

Run the Chrome smoke checklist in the user's main browser profile, then add SPL token transfer execution with associated-token-account handling.
