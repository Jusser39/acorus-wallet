# Universal Multichain Wallet UI Plan

## Current status
Wave 1 added unified multichain adapter foundation. EVM remains working. Solana has adapter foundation. Tron and BTC are skeleton adapters.

## Product direction
Acorus Wallet is a universal multichain wallet + DEX shell. The UI must not be EVM-only or Solana-only.

## Scope
- Universal asset frontend model
- Universal chain helpers
- Universal explorer helpers
- Universal receive service
- Universal portfolio service
- Universal send policy
- Universal badges
- Receive page via adapters
- Dashboard branch by chain family
- Token details universal asset support
- View-only universal validation
- Non-EVM send disabled states
- Non-EVM history notices

## Non-scope
- Solana send
- Tron send
- BTC send
- Swap execution
- Swap UI
- NFT
- WalletConnect
- dApp browser
- Domain/HTTPS/SSH hardening

## Safety
- EVM send must stay working
- Backend never receives seed/privateKey/passcode
- Skeleton chains must not pretend to be complete
- Unsupported actions must be disabled clearly

## Implementation phases
1. Universal frontend types
2. Universal chain/explorer helpers
3. Universal receive service
4. Universal portfolio service
5. Send policy
6. Badges
7. Receive page
8. Wallet dashboard
9. View-only universal validation
10. Token details
11. History/send notices
12. Tests/build/VPS deploy

## Known risks
- EVM send regression
- Token details currently assumes EVM token address in some existing routes
- Solana RPC rate limits
- Skeleton chains must be visually obvious
