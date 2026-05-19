# EVM 0x Swap Production Hardening Plan

## Problem

`origin/main` is now at `0a4fd03987255f42784fc97e667f545a7e498ea3` (`Add EVM swap MVP via 0x API`).
The repository already contains a real backend 0x proxy, extension-side approval queueing, popup swap review, and `/extension-smoke` diagnostics, but the production flow is still only partially activated:

- backend routes exist for `status`, `price`, and `quote`
- `ZEROX_API_KEY` is backend-only by design
- extension execution is gated behind explicit approval
- VPS production currently reports `swap_provider_not_configured` until `ZEROX_API_KEY` is present
- token metadata, decimal-safe parsing, allowance UX, quote freshness locks, and swap activity history still need hardening before this can be treated as a production-grade EVM swap flow

## What is already ready

- Backend:
  - `GET /api/swap/evm/status`
  - `GET /api/swap/evm/0x/price`
  - `GET /api/swap/evm/0x/quote`
  - `GET /api/swap/evm/0x/sources`
- 0x service:
  - backend-only API key handling
  - safe response mapping
  - timeout + rate-limit handling
  - missing-key `503 swap_provider_not_configured`
- Wallet-core:
  - ERC-20 allowance read + approve calldata helpers
- Extension:
  - token approval queue
  - swap review queue
  - signer confirmation gate
  - live EVM send/sign execution
- Web:
  - `/swap` and popup quote flows
  - `/extension-smoke` 0x diagnostics
- Security:
  - no mnemonic/private key/passcode/signing payload sent to backend
  - no raw 0x API key exposure in frontend surfaces

## In scope for this wave

1. Production 0x env activation on VPS without leaking `ZEROX_API_KEY`
2. Read-only live smoke for `/status`, `/price`, and `/quote`
3. EVM token metadata + decimals hardening for swap amounts
4. Allowance preflight hardening:
   - exact approval default
   - infinite approval opt-in only
   - spender / allowance review details
5. Quote freshness + anti-tamper execution guards
6. Swap activity history
7. `/swap` production polish
8. `/extension-smoke` production diagnostics expansion
9. Deploy + production verification
10. Docs, memory, and reports

## Out of scope

- Solana/Jupiter swap
- Tron/BTC/TON swap
- cross-chain swap
- WalletConnect swap execution
- automatic real-money execution
- any backend custody or backend signing

## Security boundaries

- `ZEROX_API_KEY` stays only on backend / VPS env
- never print or commit `ZEROX_API_KEY`
- backend must never receive mnemonic, private key, passcode, decrypted vault, or raw signature secrets
- extension remains the only signing / broadcast boundary
- all real approvals and swaps require explicit user confirmation
- no fake success states in `/swap`, popup, or smoke harness
- diagnostics, logs, history, and docs must not contain:
  - API key
  - seed phrase
  - private key
  - passcode
  - raw sensitive signing payloads

## Implementation approach

1. Audit and sync latest `origin/main`
2. Verify current VPS env wiring and 0x status
3. If `ZEROX_API_KEY` is absent:
   - keep behavior honest
   - add exact setup documentation
   - keep smoke report blocked on key presence
4. Harden amount/token metadata so all 0x requests use decimal-safe integer conversion
5. Harden allowance flow and quote execution locks
6. Add swap history + richer diagnostics
7. Run local checks
8. Deploy only wallet services on VPS
9. Run production smoke

## Manual smoke checklist

### Backend

1. `GET https://24wallet.ru/api/swap/evm/status`
2. Confirm `provider: "0x"` and no secret exposure
3. If configured:
   - run tiny read-only `price`
   - run tiny read-only `quote`
   - verify native sell path has no approval requirement
   - verify ERC-20 sell path returns approval/spender context

### Web `/swap`

1. Open `https://24wallet.ru/swap`
2. Confirm 0x provider status banner
3. Confirm extension detection / no-extension state
4. Select EVM chain + pair + amount
5. Fetch price / quote
6. Verify countdown / refresh / wrong-chain handling
7. Verify no fake success on missing provider or missing extension

### Extension popup

1. Reload unpacked extension
2. Unlock test wallet
3. Fetch quote
4. If approval required:
   - review token
   - review spender
   - review exact vs infinite mode
5. Queue swap
6. Verify final review card shows:
   - provider
   - route
   - contract
   - sell/buy amounts
   - min received
   - risk labels
7. Only if explicitly intended, do a tiny manual swap

### Extension smoke

1. Open `https://24wallet.ru/extension-smoke`
2. Verify provider detection
3. Verify 0x status block
4. Run price test
5. Run quote test
6. Copy diagnostics and confirm no secret leakage

## Known baseline limitations before implementation

- production may still have `configured=false` until `ZEROX_API_KEY` is set
- current popup/web swap UI still relies on raw integer amounts in several places
- quote freshness currently exists, but anti-tamper and history need more depth
- allowance flow exists, but production-grade preflight/review is still incomplete
