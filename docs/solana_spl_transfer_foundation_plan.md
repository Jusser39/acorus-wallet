# Solana SPL Transfer Foundation Plan

## Goal

Extend the Solana wallet MVP beyond native SOL sends by adding a safety-reviewed SPL transfer foundation that can create drafts, estimate fees, surface recipient ATA risk, and execute only after explicit extension confirmation.

## Scope

- Add wallet-core SPL helpers:
  - mint and owner validation
  - associated token address derivation
  - recipient ATA existence check
  - SPL transfer draft builder
  - fee estimate helper
  - SPL transfer execution with optional recipient ATA creation
- Add extension queue payload support for Solana native and SPL assets.
- Add popup send asset selection for SOL plus discovered SPL tokens.
- Add approval card fields for token mint, token type, fee, and ATA warning.
- Keep Tron, BTC, TON execution gated.
- Do not touch swap execution.

## Security Boundary

- The extension sends only public transfer metadata through approval queues.
- Mnemonic and signing remain in the unlocked extension vault session.
- No seed, private key, passcode, or signing payload is sent to backend APIs.
- SPL execution checks that the requested sender matches the unlocked Solana profile.

## Acceptance Checks

- Wallet-core SPL draft tests cover invalid mint, invalid recipient, zero amount, insufficient balance, and missing ATA warning.
- Extension tests confirm SPL queue and approval UI source guards.
- Extension portfolio price API uses `https://24wallet.ru` first.
- Extension and web builds pass.
