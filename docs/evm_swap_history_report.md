# EVM Swap History Report

## Result

Swap and approval activity is now recorded locally without storing secrets or raw calldata.

## Extension activity

- popup Activity now shows recent 0x events from local extension storage:
  - `approval_requested`
  - `approval_submitted`
  - `approval_rejected`
  - `approval_failed`
  - `swap_requested`
  - `swap_submitted`
  - `swap_rejected`
  - `swap_failed`

## Web activity

- `/swap` now keeps a local recent activity list for:
  - queued approvals
  - failed approvals
  - queued swaps
  - failed swaps

## Safety notes

- no mnemonic/private key/passcode stored
- no raw swap calldata stored
- no backend dependency required for these local activity logs
