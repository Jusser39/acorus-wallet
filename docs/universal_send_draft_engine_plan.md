# Universal Send Draft Engine Plan

## Current status
Acorus Wallet has a multichain adapter foundation and universal UI layer. EVM send remains working through the existing flow. Non-EVM sends are disabled.

## Product direction
The wallet must support sending many assets across many networks through a common draft/review/safety architecture.

## Scope
- Shared send draft types
- Send support status
- Fee estimate structure
- Send validation issues
- Amount parsing helpers
- Balance validation helpers
- SendDraftEngine
- EVM native/ERC-20 draft support
- Solana coming-soon draft support
- Tron skeleton draft support
- Bitcoin skeleton draft support
- Frontend createUniversalSendDraft service
- Optional SendDraftPreview component
- Tests/build/VPS deploy

## Non-scope
- Solana real send
- Tron real send
- BTC real send
- Swap
- NFT
- WalletConnect
- Full send page rewrite
- Domain/HTTPS/SSH hardening

## Safety
- SendDraft does not broadcast transactions
- Backend never receives seed/privateKey/passcode
- EVM send path remains working
- Unsupported networks must produce explicit disabled draft state

## Implementation phases
1. Shared send draft type alignment
2. wallet-core send amount helpers
3. wallet-core send validation helpers
4. SendDraftEngine
5. Adapter createSendDraft methods
6. Frontend draft service
7. Optional preview component
8. Tests/build/VPS deploy

## Known risks
- Amount parsing across decimals
- EVM fee estimate differences native vs ERC-20
- Accidentally implying Solana/Tron/BTC send is live
- Regressing old EVM send
