# Product Parity Audit: MetaMask, Trust Wallet, Uniswap

| Area | Acorus Current | Target | Gap | Next Wave |
| --- | --- | --- | --- | --- |
| Wallet creation/import | Extension and web flows exist, vault is local | Extension-first default with polished onboarding | Manual Chrome smoke still needed | Chrome onboarding QA |
| Vault security | Local encrypted vault, no backend seed backup | Hardened memory and supply-chain model | Memory wiping and supply-chain CI pending | Security hardening wave |
| EVM provider | EIP-1193/EIP-6963 bridge, add-chain/watch-asset approvals | Broad dApp compatibility | More real-site matrix coverage needed | Provider compatibility QA |
| dApp connection | Injected provider and approvals | Trust/MetaMask-like connection center | WalletConnect not live | WalletConnect v2 wave |
| EVM send | Live behind extension approval | Multi-network send with activity refresh | More token/history polish | Activity/portfolio wave |
| Solana send | SOL/SPL foundations live/gated | Phantom-like supported subset | Jupiter execution not live | Jupiter execution review |
| Tron | Receive/profile skeleton | TRX/TRC-20 balance/send | Execution gated | Tron MVP |
| Bitcoin | Discovery/receive gated | BTC balance/send and UTXO safety | No UTXO execution | Bitcoin adapter wave |
| TON | Discovery skeleton | TON balance/send | Execution gated | TON adapter wave |
| Swap EVM 0x | Backend quote and extension-gated execution | Mature DEX route UX | Tiny real swap smoke pending | Tiny funded 0x smoke |
| Solana Jupiter | Backend quote/review foundation | Quote + extension execution | Review-only | Jupiter execution wave |
| Cross-chain | Rango backend quote/review foundation | Multi-chain route execution | Review-only | Rango execution safety wave |
| WalletConnect | Not live | Session proposals and execution | Missing | WalletConnect wave |
| NFT | Basic shell | Display/send/burn by family | Partial | NFT wave |
| Portfolio | EVM/Solana live pieces | Full balances/prices/activity | Gated families missing | Portfolio refresh wave |
| Token discovery | Explore tabs and token pages | Rich market terminal | More pool/activity context | Market intelligence wave |
| Token detail | Charts, links, metrics, embedded swap | Uniswap-like research + trade | Pool feed and watchlist pending | Token activity wave |
| Activity/history | Local swap history and transaction records | Unified wallet timeline | Needs extension sync polish | Activity wave |
| Mobile | Not packaged | Mobile wallet | Not started | Later |
| Chrome Store | Extension package generated | Store-ready privacy and QA | Store assets/audit pending | Release prep |
