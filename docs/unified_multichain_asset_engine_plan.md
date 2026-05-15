# Unified Multichain Asset Engine Plan

## Current status
Acorus Wallet currently has a strong EVM wallet layer with portfolio, token management, market data and send flow.

## Strategic direction
Acorus Wallet becomes a multichain wallet + DEX shell. All chains must plug into a common adapter architecture.

## Scope
- ChainAdapter interface
- AssetBalance / AssetRef / ChainRef types
- EVM adapter wrapper over existing EVM logic
- Solana adapter foundation
- Tron adapter skeleton
- UTXO/BTC adapter skeleton
- AdapterRegistry
- Universal receive data
- Universal portfolio loader foundation
- Swap quote interfaces only
- Tests/build/VPS deploy

## Non-scope
- Solana send
- Tron real balance/send
- BTC real balance/send
- Swap implementation
- NFT
- WalletConnect
- Domain/HTTPS/SSH hardening

## Architecture
wallet-core exposes chain adapters. Frontend uses registry/adapters instead of hardcoding EVM everywhere.

## Safety
- Backend never receives seed/privateKey/passcode
- EVM send remains existing flow
- Solana send disabled
- Tron/BTC are skeleton-only

## Implementation phases
1. Shared multichain types
2. wallet-core adapter interfaces
3. EVM adapter
4. Solana adapter foundation
5. Tron/BTC skeleton adapters
6. Adapter registry
7. Web portfolio/receive compatibility
8. Tests/build/VPS deploy

## Known risks
- Too much refactor can break working EVM flow
- Public Solana RPC can rate-limit
- Tron/BTC skeleton should not pretend to be complete
- Swap types must not imply swap is implemented
