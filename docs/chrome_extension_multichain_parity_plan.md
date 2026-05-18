# Chrome Extension Multichain Parity Plan

## Goal

Move Acorus Wallet extension from a demo popup into a real multichain wallet shell: network selection, portfolio snapshot, watched assets, receive/send/swap/buy entry points, and dApp-compatible EIP-1193/EIP-6963 behavior.

## Scope

- Extension-local network registry for built-in EVM networks, Solana, Tron, Bitcoin, TON, and validated custom EVM networks.
- Extension-local watched assets storage for ERC-20 tokens added through `wallet_watchAsset`.
- Portfolio snapshot for popup/options surfaces with honest `live_rpc`, `unavailable`, and `skeleton` source labels.
- Popup home with account selector, network selector, total portfolio placeholder, quick actions, tokens/activity/dApps tabs, receive composer, and safe send/swap/buy links.
- Runtime messages for extension home, active chain switching, custom chain add, asset watch/hide/unhide.
- Tests for chain registry and asset storage behavior.

## Non-Scope

- Live non-EVM send execution.
- Raw WalletConnect relay execution.
- Bank card/on-ramp custody inside the extension.
- Real swap broadcast execution where an adapter has not been security-reviewed.

## Security Boundary

- Mnemonic, private keys, passcode, and decrypted vault material stay inside the extension vault boundary.
- Content scripts and pages receive only approved accounts, chain IDs, provider results, and public portfolio metadata.
- Custom EVM chains must pass `eth_chainId` validation before persistence.
- Non-EVM send/swap remain capability-gated until adapters can sign and broadcast safely.

## Validation Checklist

- Build extension.
- Keep existing EVM sign/send execution working.
- Verify `wallet_addEthereumChain` persists a validated custom EVM network.
- Verify `wallet_watchAsset` persists an ERC-20 token.
- Verify popup no longer uses hardcoded fake assets as primary portfolio data.
- Verify no sensitive raw vault material is added to storage models outside encrypted vault.
