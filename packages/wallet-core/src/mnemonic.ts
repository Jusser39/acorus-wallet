import { generateMnemonic, validateMnemonic } from "bip39";
import { mnemonicToAccount } from "viem/accounts";
import type { Address } from "viem";

export function generateWalletMnemonic(): string {
  return generateMnemonic();
}

export function validateWalletMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim().toLowerCase());
}

export function getEvmAddressFromMnemonic(mnemonic: string): Address {
  return mnemonicToAccount(mnemonic.trim().toLowerCase()).address;
}
