"use client";

import type { ChainFamily, ChainId } from "@acorus/shared";

type AcorusRequestInput = {
  method: string;
  params?: unknown[];
};

type AcorusProvider = {
  isAcorus?: boolean;
  request(input: AcorusRequestInput): Promise<unknown>;
};

declare global {
  interface Window {
    acorus?: AcorusProvider;
  }
}

export type ExtensionVaultProfile = {
  profileId: string;
  name: string;
  account: string;
  chainFamily: ChainFamily;
  chainIds: ChainId[];
  selected: boolean;
};

export type ExtensionVaultStatus = {
  hasVault: boolean;
  isUnlocked: boolean;
  activeProfileId: string | null;
  profiles: ExtensionVaultProfile[];
  unlockedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ExtensionCreateWalletResult = {
  profileId: string;
  name: string;
  account: string;
  mnemonic: string;
  warning: string;
};

export type ExtensionReceiveAddressResult = {
  address: string;
  profileId: string;
  chainFamily: ChainFamily;
  chainIds: ChainId[];
} | null;

export function hasAcorusExtension(): boolean {
  return typeof window !== "undefined" && Boolean(window.acorus?.request);
}

export async function requestAcorusExtension<T>(
  method: string,
  params?: unknown[],
): Promise<T> {
  if (!window.acorus?.request) {
    throw new Error("Acorus extension is not installed or not enabled in this browser profile.");
  }

  return window.acorus.request({ method, params }) as Promise<T>;
}

export function getExtensionVaultStatus(): Promise<ExtensionVaultStatus> {
  return requestAcorusExtension<ExtensionVaultStatus>("acorus_getVaultStatus");
}

export function createExtensionWallet(input: {
  name: string;
  passcode: string;
}): Promise<ExtensionCreateWalletResult> {
  return requestAcorusExtension<ExtensionCreateWalletResult>("acorus_createWallet", [input]);
}

export function importExtensionWallet(input: {
  name: string;
  mnemonic: string;
  passcode: string;
}): Promise<Omit<ExtensionCreateWalletResult, "mnemonic">> {
  return requestAcorusExtension("acorus_importWallet", [input]);
}

export function unlockExtensionWallet(input: {
  passcode: string;
}): Promise<ExtensionVaultStatus> {
  return requestAcorusExtension("acorus_unlockWallet", [input]);
}

export function getExtensionReceiveAddress(input: {
  family: ChainFamily;
  chainId?: ChainId;
}): Promise<ExtensionReceiveAddressResult> {
  return requestAcorusExtension("acorus_receiveAddress", [input]);
}

export function requestExtensionSend(input: Record<string, unknown>): Promise<unknown> {
  return requestAcorusExtension("acorus_multichainSend", [input]);
}

export function requestExtensionEvmSendTransaction(input: Record<string, unknown>): Promise<unknown> {
  return requestAcorusExtension("acorus_sendTransaction", [input]);
}

export function requestExtensionSwap(input: Record<string, unknown>): Promise<unknown> {
  return requestAcorusExtension("acorus_swap", [input]);
}

export function requestExtensionUniversalSwap(input: Record<string, unknown>): Promise<unknown> {
  return requestAcorusExtension("acorus_swap", [input]);
}

export function getExtensionChainId(): Promise<string | number | null> {
  return requestAcorusExtension("acorus_chainId");
}

export function switchExtensionChain(chainId: string | number): Promise<unknown> {
  return requestAcorusExtension("acorus_switchChain", [chainId]);
}
