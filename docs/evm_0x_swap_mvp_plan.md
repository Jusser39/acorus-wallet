# EVM 0x Swap MVP Plan

## Goal

Add a safety-gated EVM swap MVP using the 0x Swap API through the Acorus backend. Browser clients and the Chrome extension must never receive the 0x API key. Swap execution is only allowed after explicit extension approval.

## Current Base

- Universal swap shell exists in `apps/web/components/swap-composer.tsx`, but it uses the preview `/api/swap/quote` mock engine.
- Extension already has an approval queue, EVM transaction execution, add-chain/watch-asset approval prompts, Solana send, and portfolio assets.
- Wallet-core already has EVM public/wallet clients, ERC-20 transfer helpers, and custom viem chain support.
- API currently has market routes and the preview swap quote route, but no 0x proxy.

## Additions

- Shared 0x EVM swap request/response/draft types in `packages/shared/src/multichain.ts`.
- Backend 0x service and routes:
  - `GET /api/swap/evm/status`
  - `GET /api/swap/evm/0x/price`
  - `GET /api/swap/evm/0x/quote`
  - optional sources metadata
- Wallet-core ERC-20 allowance and approve transaction helpers.
- Extension approval queue messages for:
  - ERC-20 approval transaction
  - 0x swap transaction
- Extension popup EVM swap MVP:
  - EVM network/token selection
  - slippage
  - quote preview
  - explicit token approval and swap review
- Web `/swap` update for 0x EVM MVP with Acorus extension execution prompts.
- `/extension-smoke` 0x diagnostics.

## Security Boundary

- `ZEROX_API_KEY` is server-only and read from backend environment.
- Frontend and extension call only Acorus backend routes.
- Backend returns a safe subset of 0x responses, not the whole raw payload.
- Quote calldata is never logged raw by Acorus code.
- Extension rejects stale quotes, account mismatches, and chain mismatches.
- Approval and swap transactions go through the existing explicit popup approval flow.

## Out Of Scope

- Solana/Jupiter swap.
- Tron, Bitcoin, TON swap.
- Cross-chain swap.
- WalletConnect execution.
- Custodial/on-ramp flow.

## Risks

- 0x provider may be unconfigured in production until `ZEROX_API_KEY` is installed.
- ERC-20 swaps need a separate approval transaction before the swap.
- Quotes can expire or change; stale quotes must be blocked.
- Custom or unverified token addresses can create user risk, so UI must show warnings.
