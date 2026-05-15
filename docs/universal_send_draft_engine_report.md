# Universal Send Draft Engine Report

## Scope

Implemented universal send draft foundation for multichain transfers.

## Implemented

* Shared send draft types
* Send support status
* Fee estimate structure
* Send validation issues
* Amount parsing helpers
* Balance validation helpers
* SendDraftEngine
* EVM native/ERC-20 draft support
* Solana coming-soon draft support
* Tron skeleton draft support
* Bitcoin skeleton draft support
* Frontend createUniversalSendDraft service
* SendDraftPreview component

## Non-scope

* Solana real send
* Tron real send
* Bitcoin real send
* Swap
* NFT
* WalletConnect
* Full send page rewrite

## Safety

* SendDraft does not broadcast transactions
* Backend still never receives seed/privateKey/passcode
* EVM send path remains preserved
* Unsupported networks return explicit disabled draft state

## Checks

* wallet-core tests
* web tests
* api tests
* builds
* VPS health
* persistence after restart

## Known limitations

* EVM fee estimate is draft-level / approximate
* Solana/Tron/BTC send are not implemented
* Universal Send UI is not implemented yet
* Existing EVM send page still uses the old working flow

## Next wave

Universal Send UI.
