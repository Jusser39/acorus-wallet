import { generateMnemonic, validateMnemonic } from "bip39";
import { keccak256, sha256 } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import type { Address } from "viem";

export function generateWalletMnemonic(): string {
  return generateMnemonic();
}

export function validateWalletMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim().toLowerCase());
}

export function deriveEvmAccountFromMnemonic(mnemonic: string) {
  return mnemonicToAccount(mnemonic.trim().toLowerCase());
}

export function getEvmAddressFromMnemonic(mnemonic: string): Address {
  return deriveEvmAccountFromMnemonic(mnemonic).address;
}

export function getTronAddressFromMnemonic(mnemonic: string): string {
  const account = deriveEvmAccountFromMnemonic(mnemonic);
  const publicKey = account.publicKey.startsWith("0x04")
    ? account.publicKey.slice(4)
    : account.publicKey.replace(/^0x/u, "");
  const hash = keccak256(`0x${publicKey}`);
  const addressHex = `41${hash.slice(-40)}`;
  const checksum = sha256(sha256(`0x${addressHex}`)).slice(2, 10);
  return encodeBase58(`0x${addressHex}${checksum}`);
}

function encodeBase58(hex: `0x${string}`): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = hexToBytes(hex);
  let value = BigInt(hex);
  let output = "";

  while (value > 0n) {
    const remainder = Number(value % 58n);
    output = alphabet[remainder] + output;
    value /= 58n;
  }

  for (const byte of bytes) {
    if (byte !== 0) {
      break;
    }
    output = alphabet[0] + output;
  }

  return output || alphabet[0]!;
}

function hexToBytes(hex: `0x${string}`): number[] {
  const clean = hex.slice(2);
  const bytes: number[] = [];

  for (let index = 0; index < clean.length; index += 2) {
    bytes.push(Number.parseInt(clean.slice(index, index + 2), 16));
  }

  return bytes;
}
