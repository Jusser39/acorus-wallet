# Chrome Extension Parity Stabilization Plan

## Goal

Stabilize the extension parity wave after `ad77ae9` without adding broad new product scope.

## Scope

- Gate `wallet_addEthereumChain` and `wallet_watchAsset` behind extension approval prompts.
- Validate and persist custom EVM networks only after user confirmation.
- Persist watched ERC-20 assets only after user confirmation.
- Fix receive UI so each selected network family shows only its matching address.
- Remove duplicate inpage injection and keep Manifest V3 MAIN-world injection as the single provider source.
- Add `All networks` portfolio mode for popup views only.
- Allow custom EVM chain configs to create viem clients for sign/send paths.
- Add RPC timeout and private/local RPC blocking for custom EVM networks.

## Non-Scope

- New swap providers.
- New non-EVM signing or broadcasting.
- WalletConnect relay execution.
- Backend custody or key handling changes.

## Validation

- Extension approval tests for add-chain/watch-asset.
- Receive/inpage source checks.
- Wallet-core custom viem chain test.
- Full workspace build/test/package commands.
