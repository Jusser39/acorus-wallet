# Solana Wallet Skeleton Plan

## Current status
Acorus Wallet already supports EVM wallet UX, send flow, portfolio, token management, real market providers and Prisma persistence.

## Scope
- Solana chain config
- Solana derivation from mnemonic
- SOL balance
- SPL token balances
- Solana receive
- Solana view-only
- Solana practice mode
- Chain family switch
- Dashboard support
- API/client compatibility
- Tests/build/VPS deploy

## Non-scope
- Solana real send
- Solana NFT
- Solana swap
- WalletConnect
- dApp browser
- Tron
- Domain/HTTPS/SSH hardening

## Security rules
- Backend never receives seed/privateKey/passcode
- Solana private key exists only client-side in memory after unlock
- Receive/view-only can work without private key
- Solana send disabled in this wave

## Implementation phases
1. Dependencies
2. Shared Solana chain/token types
3. wallet-core Solana module
4. web Solana RPC helpers
5. wallet store chain family support
6. create/import/view-only support
7. dashboard/receive support
8. practice support
9. token details/history skeleton
10. tests/build/VPS deploy

## Known risks
- Public Solana RPC can rate-limit
- SPL token metadata is limited without token registry/provider
- Same mnemonic can derive EVM and Solana, but paths must be explicit
- Solana send is intentionally disabled
