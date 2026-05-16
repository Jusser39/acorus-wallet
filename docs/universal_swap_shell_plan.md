# Universal Swap Shell Plan

## Current status

The repository already has shared swap quote primitives (`SwapQuoteRequest`, `SwapQuote`, `SwapRouteStep`) and a wallet-core swap placeholder provider, but there is no universal swap product flow, no adapter capability contract for swap execution, and no live provider integration yet.

## Product direction

Swap must be a **universal shell**, not a set of separate chain-specific swap screens.

Primary user flow:

`Network / Route Scope → From Asset → To Asset → Quote → Route Review → Approval → Execute → Track`

The same product shell must work for:

- single-family swaps (EVM, Solana, Tron, future TON)
- later cross-chain swaps
- capability-gated families that are not ready yet

## Goals

- keep swap fully non-custodial
- make provider differences invisible at the product-shell level
- reuse `AssetRef`, `ChainRef`, adapter capabilities, explorer, and transaction tracking
- support both native assets and token standards through one quote/review model
- allow provider failover without changing the main UI contract

## Non-goals

- direct implementation of every family/provider in one wave
- cross-chain execution before single-family execution is stable
- backend custody, backend signing, or server-side secret storage
- hiding provider/security differences from the user when they matter

## Required universal swap contract

The next implementation waves should add shared types for:

1. `SwapSupportStatus`
2. `SwapQuoteRequest`
3. `SwapQuoteResult`
4. `SwapExecutionRequest`
5. `SwapExecutionResult`
6. `SwapApprovalRequirement`
7. `SwapRouteSummary`
8. provider/source metadata
9. swap-specific warnings and risk flags

The adapter layer should expose:

- `capabilities.swap`
- quote support metadata
- execution support metadata
- spender/approval requirements
- family-specific constraints mapped into shared warnings/errors

## Product UX rules

- the main UX stays universal: no dedicated “EVM swap page”, “Solana swap page”, etc.
- unsupported families show disabled states with explicit reasons
- quote cards must clearly show provider, route, slippage, fees, min received, and expiry
- approval and execution are separate confirmation steps
- if a family requires a pre-approval transaction (for example token allowance), it must be modeled explicitly rather than hidden

## Rollout sequence

### Phase 1 — Shared swap contract

- expand shared types for quote/execution/approval
- extend adapter capabilities for swap quote/execution
- define unified error codes and support statuses
- make UI rendering capability-driven

### Phase 2 — Universal swap composer

- add swap shell in web UI with family-aware asset selection
- quote request/retry states
- route review card
- capability-gated disabled states for unsupported families

### Phase 3 — EVM reference implementation

EVM becomes the first live reference implementation because it already has the strongest send/broadcast foundation.

- add EVM quote provider adapters
- support native ↔ ERC-20 and ERC-20 ↔ ERC-20
- support explicit approval step and explicit execution step
- persist public transaction records and quote metadata safely

### Phase 4 — Solana swap adapter

- add Solana quote/execution provider adapter
- keep the same review and approval model where semantics allow it
- map Solana-specific routing/account constraints into shared warnings

### Phase 5 — Tron and future families

- add Tron family support when custody/send foundations are ready
- add TON/next families through the same quote/execution contract
- keep unsupported families honestly disabled until safe

### Phase 6 — Cross-chain swaps

- add route-level orchestration only after single-family swap execution is stable
- keep bridge/provider risks explicit in the review step
- never blur same-chain swap risk with cross-chain bridge risk

## Security invariants

- backend never receives mnemonic/privateKey/passcode
- quote fetching may use backend-safe public metadata, but approvals and execution remain client-side
- every approval and execution must require explicit user confirmation
- provider warnings, slippage, expiry, and min-received must be visible before execution
- unsupported or partially supported families must not imply live execution

## Exit criteria

The universal swap shell is ready for implementation waves when:

- one shared quote/review/execute UX can render any family via capabilities
- EVM can act as the first live reference adapter
- Solana/Tron/UTXO future support can plug into the same contract without redesigning the product
- cross-chain is treated as an extension of the same engine, not a parallel product
