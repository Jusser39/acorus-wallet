# EVM 0x Swap Security Model

## Boundaries

- Backend owns `ZEROX_API_KEY`.
- Web and extension call Acorus API routes, never `https://api.0x.org` directly with credentials.
- The extension owns signing and transaction broadcast through its local encrypted vault.
- Seed phrase, private key, passcode, raw signature material, and decrypted vault state never leave the extension/client boundary.

## Approval Flow

1. User requests a quote.
2. Backend proxies 0x AllowanceHolder quote and returns only fields needed for user review and execution.
3. If allowance is required, extension queues an ERC-20 approval transaction.
4. User confirms or rejects the approval in the popup.
5. User queues the swap transaction.
6. Extension verifies quote freshness, chain, and account context.
7. User confirms or rejects the swap in the popup.
8. Only confirmed transactions are sent by the extension wallet.

## Risk Controls

- API timeout is 8 seconds.
- Missing provider key returns `swap_provider_not_configured`.
- Invalid token, taker, chain, and amount inputs are rejected server-side.
- Quote calldata is not displayed as raw JSON in approval cards.
- Swap approvals include route, contract, amount, min received, and risk labels.
- Stale quotes require refresh.

## Non-Scope

- Solana/Jupiter swaps.
- Cross-chain swaps.
- WalletConnect swap execution.
- Custodial or backend signing.
