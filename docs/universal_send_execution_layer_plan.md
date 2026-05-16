# Universal Send Execution Layer Plan

## Current status
Wave 4 added Universal Send UI. Users can create drafts for EVM and disabled drafts for non-EVM adapters. Old EVM send remains available through the legacy flow.

## Product direction
The wallet must execute supported sends through a universal adapter execution layer. EVM is the first real broadcast implementation because it already has working send helpers. Solana/Tron/BTC remain part of the same architecture but broadcast-disabled until their adapter implementations are safety-reviewed.

## Scope
- Shared execution request/result types
- Adapter broadcast method
- Universal SendExecutionEngine
- EVM broadcast implementation for native/ERC-20
- Client-side frontend execution service
- SendComposer review execute bridge
- Transaction record creation
- Explorer/status display
- Disabled broadcast for Solana/Tron/BTC

## Non-scope
- Solana real send
- Tron real send
- BTC real send
- Swap
- NFT
- WalletConnect
- dApp browser
- Domain/HTTPS/SSH hardening

## Safety
- Backend never receives seed/privateKey/passcode
- Execution is client-side only
- Unsupported adapters cannot broadcast
- Legacy EVM flow stays as fallback
- SendComposer must not imply non-EVM can send real funds

## Implementation phases
1. Shared execution types
2. Adapter interface extension
3. SendExecutionEngine
4. EVM adapter broadcast
5. Non-EVM disabled broadcast
6. Frontend execution service
7. SendComposer review bridge
8. Transaction persistence
9. Tests/build/VPS deploy

## Known risks
- Accidentally leaking private data to backend
- Breaking old EVM send
- Incorrect native/ERC-20 branch
- Double transaction record creation
- Non-EVM UI implying live broadcast
