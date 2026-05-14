# Security Model

## Non-custodial baseline

Acorus Wallet is designed as a **non-custodial wallet**.

- Backend must not receive mnemonic, seed phrase, private key, passcode, or raw transaction signing payloads.
- Backend stores public metadata only.
- Decryption and signing stay on the client.

## Local vault

- Vault format: versioned payload
- KDF: PBKDF2 SHA-256
- Cipher: AES-GCM
- Random salt and IV per vault
- Passcode is never persisted

## Sensitive data rules

Never log:

- mnemonic
- seed
- seedPhrase
- privateKey
- passcode
- password
- signature
- rawTransaction
- encryptedVault

## Threat model

Protected against:

- backend compromise exposing private keys
- accidental server-side persistence of seed/private key
- basic local disclosure through logs or network requests

Not fully solved yet:

- compromised browser/device
- clipboard malware
- phishing / fake dApps
- full secure enclave integration

## Lock and autolock

- Manual lock clears decrypted vault from Zustand memory
- Autolock runs after configured timeout
- Hidden tab timeout also locks the wallet

## Mobile phase

Future mobile builds should move unlock orchestration to:

- iOS Keychain / Secure Enclave
- Android Keystore / StrongBox where available
