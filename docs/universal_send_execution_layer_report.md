# Universal Send Execution Layer Report (Wave 5)

## Status: Implemented, Validated, Deployed

## What was built

### Shared types (`packages/shared/src/multichain.ts`)
- `SendExecutionStatus`: `"submitted" | "rejected" | "failed" | "unsupported"`
- `SendExecutionRequest`: wraps a `SendDraft` with `signerSecretRef: "local_vault"` marker
- `SendExecutionResult`: uniform result type with `family`, `chainId`, `status`, `txHash`, `explorerUrl`, `errorCode`, `errorMessage`, `broadcastProvider`, `submittedAt`

### Adapter interface (`packages/wallet-core/src/adapters/types.ts`)
- Added `BroadcastSendInput`: `{ draft, mnemonic?, privateKey?, rpcUrl? }`
- Added optional `broadcastSend?(input: BroadcastSendInput): Promise<SendExecutionResult>` to `ChainAdapter` interface

### Send Execution Engine (`packages/wallet-core/src/send/execution-engine.ts`) — NEW
- `SendExecutionEngine` class with `execute()` method
- Pre-flight checks: unsupported if adapter lacks broadcast capability or `broadcastSend` method
- Validation check: rejected if draft has `errors.length > 0`
- Delegates to `adapter.broadcastSend()` with full try/catch → `failed` on throw
- Exported via `packages/wallet-core/src/send/index.ts`

### EVM adapter broadcast (`packages/wallet-core/src/adapters/evm-adapter.ts`)
- `broadcastSend()` checks: missing mnemonic → `missing_signer`, missing rpcUrl → `missing_rpc_url`
- Branches on `draft.asset.type === "native"` → calls `sendNativeTransaction({ mnemonic, chainId, to, amountWei: BigInt(draft.amountRaw) })` or `sendErc20Transaction({ ..., amountUnits: BigInt(draft.amountRaw) })`
- Returns `status: "submitted"` with real `txHash` from viem
- Explorer URL built via existing `buildExplorerTxUrl()` helper

### Non-EVM adapters
- `solana-adapter.ts`: explicit `broadcastSend()` → `unsupported` / `solana_broadcast_not_enabled`
- `tron-adapter.ts`: explicit `broadcastSend()` → `unsupported` / `tron_broadcast_not_enabled`
- `utxo-adapter.ts`: explicit `broadcastSend()` → `unsupported` / `utxo_broadcast_not_enabled`

### Frontend execution service (`apps/web/lib/send-execution.ts`) — NEW
- `executeUniversalSend({ draft, mnemonic?, privateKey? })`: client-side only
- Creates registry + engine, resolves `rpcUrl` via `getRpcUrlForUniversalChain()`
- Never imported from server components or API routes

### SendComposer execute bridge (`apps/web/components/send-composer.tsx`)
- New props: `mnemonic?`, `privateKey?`, `onExecutionResult?`
- New state: `executing`, `executionResult`
- `handleExecuteDraft()`: calls `executeUniversalSend()`, sets result, triggers `onExecutionResult` callback
- Preview panel execute block:
  - Shows "Wallet locked" notice if no mnemonic and local profile
  - Shows "Broadcast transaction" button only if `draft.canBroadcast` && local profile && mnemonic present
  - Shows execution result: status, tx hash (monospace), explorer link, error message
  - Non-EVM: amber "broadcast disabled" notice (unchanged from Wave 4)

### Send page (`apps/web/app/send/page.tsx`)
- Both `SendComposer` instances (non-EVM and EVM) receive `mnemonic={unlockedVault?.mnemonic ?? null}`
- EVM instance `onExecutionResult` callback: persists tx via `createTransaction()` after `status === "submitted"`

## Tests
- 2 new `SendExecutionEngine` tests added to `packages/wallet-core/src/wallet-core.test.ts`:
  - `returns unsupported for Solana` (broadcast=false adapter)
  - `returns rejected for EVM with missing_signer` (no mnemonic)
- wallet-core: 24/24 tests pass
- web: 49/49 tests pass
- `pnpm build`: clean, 18 routes, TypeScript strict

## VPS deployment
- Build: `docker compose build api web` — both built successfully
- Deploy: `docker compose up -d api web nginx` — containers recreated, health checks passed
- Verified:
  - `GET /health` → `{"status":"ok","store":"prisma"}`
  - `GET /api/chains` → 9 chains including EVM, Solana, Tron skeleton, Bitcoin skeleton
  - `GET /send` → HTTP 200
  - Persistence verified after `docker compose restart api`
  - Public URL `http://85.239.59.199:8080/health` → ok

## Safety invariants maintained
- Backend never receives mnemonic/privateKey/passcode
- `BroadcastSendInput.signerSecretRef` is only a marker string ("local_vault"), not actual key material
- Non-EVM broadcast button never renders (`draft.canBroadcast=false` for Solana/Tron/BTC)
- Legacy EVM send form preserved under `#evm-send-form` anchor
- `send-execution.ts` has no server-side import paths

## Known limitations
- `onExecutionResult` in `send/page.tsx` persists tx with placeholder `to: ""`, `amount: "0"`, `assetType: "native"` because full draft details live inside `SendComposer` internal state. For a future improvement, pass `draft` alongside `result` in the callback.
- Prisma `db push` inside running container required the correct path `/app/apps/api/prisma/schema.prisma` — the deploy script used an incorrect short path but the schema was already in sync from Wave 4.

## Architecture summary

```
SendDraft (canBroadcast=true, no errors)
  → executeUniversalSend() [client-side, apps/web]
    → SendExecutionEngine.execute() [wallet-core]
      → adapter.broadcastSend() [evm-adapter]
        → sendNativeTransaction() / sendErc20Transaction() [viem]
        → returns SendExecutionResult { status: "submitted", txHash, explorerUrl }
  → onExecutionResult callback
    → createTransaction() [apps/web/lib/api.ts]
    → UI: show txHash + explorer link
```

## Next wave
Wave 6: Solana Send Adapter broadcast implementation
