# EVM 0x Tiny Real Swap Checklist

## Before any real swap

- use a separate funded test wallet
- use a tiny amount only
- verify the selected chain
- verify token addresses
- verify slippage
- verify route label
- verify minimum received
- make sure reject flow was already tested first

## Native ETH -> USDC

- allowance is not required
- only the swap approval should appear

## USDC -> ETH

- use exact approval first
- wait until the approval transaction is submitted
- refresh allowance / quote
- only then review the swap

## PASS criteria

- tx hash is returned
- explorer link opens correctly
- activity history shows the submitted swap
- balances / portfolio update after refresh

## FAIL criteria

- wrong chain selected
- stale quote
- allowance spender mismatch
- high price impact you did not intend
- unexpected calldata tamper block
