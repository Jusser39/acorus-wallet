# Universal Dapp Shell Plan

## Current status

The project has no live WalletConnect/session/signing runtime yet. Dapp support must be designed as a universal shell so that connection, permissions, signing, and transaction requests share one model across chain families.

## Product direction

Dapp support must be a **universal multichain session shell**, not a set of unrelated integrations.

Primary user flow:

`Discover / Open dapp → Connection proposal → Permission review → Session active → Sign / Send request → User approval → Result / Track`

The user should experience one approval system even though adapters translate the request into family-specific semantics.

## Goals

- support dapp connectivity through one session/approval model
- keep permissions explicit and revocable
- keep all signing client-side only
- reuse wallet profiles, chain capabilities, and transaction tracking
- let EVM, Solana, Tron, and future families plug into the same shell over time

## Non-goals

- shipping every chain family in the first dapp wave
- auto-approving requests
- hiding risk-relevant details from the user
- backend custody, backend signing, or server-side session secrets

## Required universal dapp contract

The next implementation waves should introduce shared types for:

1. `DappSessionProposal`
2. `DappSession`
3. `DappPermission`
4. `DappRequest`
5. `DappRequestKind` (`connect`, `sign_message`, `sign_typed_data`, `sign_transaction`, `send_transaction`)
6. `DappApprovalResult`
7. `DappSessionStatus`
8. origin/app metadata and trust indicators
9. capability flags by chain family

The adapter layer should eventually expose:

- `capabilities.dapp`
- connect/session support
- message signing support
- typed data support where relevant
- transaction request translation into shared review models

## Product UX rules

- one universal approval UI for connect, sign, and send requests
- the approval screen must show origin, requested chains, requested permissions, and the active profile
- every signing/sending request must be reviewable before approval
- unsupported request kinds or unsupported families must be denied honestly with explicit reasons
- users must be able to inspect and revoke active sessions

## Rollout sequence

### Phase 1 — Shared dapp/session contract

- add shared types for sessions, permissions, request kinds, and approval results
- extend capabilities so the UI can render connection and request support honestly
- define universal error codes and reject reasons

### Phase 2 — Universal session registry UI

- add connected dapps list
- add pending request queue
- add connect/reject/revoke flows
- add chain/profile mismatch warnings

### Phase 3 — EVM reference implementation

EVM should be the first live reference implementation because the current stack already has the strongest account/send base.

- add EVM dapp session adapter
- support connect, sign message, sign typed data, and transaction/send request review
- persist only public session metadata where needed

### Phase 4 — Solana session adapter

- add Solana connection and signing support under the same session shell
- map Solana-specific request semantics into shared review models
- keep capability gating explicit where request parity differs from EVM

### Phase 5 — Tron and future families

- add Tron dapp capability when custody/send foundations are mature
- add future families only through the same session contract
- keep unsupported families and request kinds explicitly disabled

### Phase 6 — Dapp browser/runtime bridge

- add embedded/external dapp browser bridge only after the session/approval model is stable
- reuse the same approval queue and session registry rather than creating a second signing path

## Security invariants

- backend never receives mnemonic/privateKey/passcode
- connect approval is separate from signing/sending approval
- no silent request execution
- origin metadata, requested chains, and permission scope must be visible to the user
- session revocation must be first-class
- unsupported adapters must never imply live signing support

## Exit criteria

The universal dapp shell is ready for implementation waves when:

- one shared session model can represent EVM, Solana, Tron, and future families
- one approval UI can safely handle connect/sign/send requests
- EVM can act as the first live reference adapter without turning the product into an EVM-only wallet
- future families can be plugged into the same shell through capabilities instead of new product forks
