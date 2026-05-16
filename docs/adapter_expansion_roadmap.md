# Universal Adapter Expansion Roadmap

## Product direction

Acorus Wallet is a **universal multichain wallet + swap + dapp shell**. Chain families are implementation details behind a shared product contract, not separate wallet products.

That means:

- users move through one universal flow: `Network → Asset → Action`
- adapters expose capability differences honestly
- unsupported functionality is disabled through capability gates, not hidden behind separate screens
- new networks are added by implementing the adapter contract, not by forking the product

## What "any coin" means

In engineering terms, "any coin" means:

1. any supported **native asset** on a supported chain family
2. any supported **token standard** on a supported chain family
3. any discovered/curated asset that can be represented by `AssetRef`

Universal coverage does **not** mean every chain and every token become live at once. It means the product and runtime are designed so new families and token standards plug into the same contracts.

## Current adapter matrix

| Family | Derive | Balances | Receive | Send Draft | Broadcast | History | Swap | Dapp | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EVM | yes | yes | yes | yes | yes | yes | no | no | strongest live adapter |
| Solana | yes | yes | yes | yes | no | no | no | no | foundation adapter |
| Tron | no | no | yes | skeleton | no | no | no | no | skeleton adapter |
| UTXO/BTC | no | no | yes | skeleton | no | no | no | no | skeleton adapter |
| TON | no | no | no | no | no | no | no | no | future family |

## Required universal adapter surface

Every family should converge toward the same runtime surface:

1. `validateAddress`
2. `deriveAccount`
3. `getNativeBalance`
4. `getTokenBalances`
5. `getReceiveInfo`
6. `buildExplorerAddressUrl`
7. `buildExplorerTxUrl`
8. `createSendDraft`
9. `broadcastSend`
10. transaction status/history refresh
11. swap quote/execution capability
12. dapp session/signing capability

The UI should rely on **capabilities**, not on family-specific routing logic.

## Expansion sequence

### Phase 1 — Contract alignment

Before adding more chain implementations, align the adapter contract around the missing universal surfaces:

- explicit history/status capability
- explicit swap capability and shared quote/result/error model
- explicit dapp capability and shared session/signing model
- capability metadata the UI can render directly

This keeps future chain work additive instead of forcing another architecture pass.

### Phase 2 — EVM expansion

EVM is already the strongest live adapter, so it should become the first full-capability reference implementation:

- keep custody, receive, balances, send draft, and live broadcast
- add universal swap quote/review/execute through EVM providers
- add universal dapp connect/sign/transaction approval through EVM session adapters
- keep all approvals and signatures client-side only

EVM is the **reference adapter**, not the product identity.

### Phase 3 — Solana completion

Solana should be brought up to the same universal shell:

- complete send broadcast and status/history
- add Solana-native swap provider integration
- add Solana dapp session/signing integration
- keep the same `Network → Asset → Action` UX and capability-gated states

### Phase 4 — Tron completion

Tron needs a full custody/send baseline before swap and dapp support:

- address/account derivation
- TRX native balance and TRC-20 token balance support
- send draft + broadcast
- history/status path
- then swap and dapp capability rollout

### Phase 5 — Bitcoin/UTXO completion

Bitcoin/UTXO requires its own transaction model but should still fit the universal shell:

- derivation and receive
- UTXO indexing and balance model
- fee estimation + coin selection
- send draft + broadcast
- history/status
- honest gating for actions that do not map cleanly to UTXO semantics

UTXO support should stay universal at the product layer even when internals differ.

### Phase 6 — TON and future families

After EVM, Solana, Tron, and UTXO/BTC have clear adapter contracts, new families such as TON should plug into the same system:

- no new product fork
- no new chain-specific app mode
- reuse the same asset/send/swap/dapp contracts where possible

## Capability rollout rules

New family work should follow this order:

1. custody: derive + receive + explorer
2. balances: native + token assets
3. send draft: validation, asset semantics, fee preview
4. send execution: client-side signing + broadcast
5. history/status: refresh and explorer parity
6. swap: quote → route → review → execute
7. dapp: connect → permissions → sign/message/tx approvals

This keeps every adapter internally coherent before claiming broader support.

## Universal UX rules

- No chain-specific first-class screens unless the same action cannot be modeled universally
- The primary UI stays `Network → Asset → Action`
- Unsupported actions render disabled states with clear reasons
- Skeleton adapters must never imply live fund movement
- Legacy chain-specific flows can temporarily exist as adapters/fallbacks, but naming and roadmap stay universal-first

## Security invariants

- Backend never receives mnemonic/privateKey/passcode
- Sensitive approvals always happen client-side
- Unsupported adapters return honest `unsupported`/`coming_soon` capability states
- Swap and dapp integrations must obey the same non-custodial boundary as send execution

## Exit criteria for universal wallet maturity

The wallet is meaningfully "universal" when:

- at least EVM, Solana, Tron, and Bitcoin/UTXO all fit the same action shell
- every family exposes honest capability metadata
- supported assets can be received, displayed, sent, and tracked through one shared UX
- swap is implemented as one engine with family adapters/providers
- dapp connectivity is implemented as one session/signing shell with family adapters
