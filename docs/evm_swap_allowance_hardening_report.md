# EVM Swap Allowance Hardening Report

## Result

Allowance review is now harder to misuse across popup, extension approval queue, and web `/swap`.

## Changes shipped

- exact approval stays the default
- infinite approval is opt-in only
- popup 0x quote preview now shows:
  - current allowance
  - required allowance
  - approval mode selector
- token approval review cards now include:
  - formatted amount
  - current allowance
  - required allowance
  - approval mode
- web `/swap` can queue an explicit ERC-20 approval request through the extension using `acorus_sendTransaction`
- extension review details now recognize token approval metadata from provider-driven approval requests

## Security effect

- no raw calldata shown in approval cards
- spender remains explicit
- infinite approval is visible and warned, not hidden behind the default path
