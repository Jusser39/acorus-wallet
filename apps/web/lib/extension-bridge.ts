"use client";

import type { ChainFamily, ChainId } from "@acorus/shared";

type AcorusRequestInput = {
  method: string;
  params?: unknown[];
};

type AcorusProvider = {
  isAcorus?: boolean;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  request(input: AcorusRequestInput): Promise<unknown>;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

type Eip6963ProviderDetail = {
  info?: {
    name?: string;
    rdns?: string;
  };
  provider?: AcorusProvider;
};

let discoveredProvider: AcorusProvider | null = null;
let discoveryListenerRegistered = false;

declare global {
  interface Window {
    acorus?: AcorusProvider;
    acorusEthereum?: AcorusProvider;
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

function isAcorusProvider(provider: unknown): provider is AcorusProvider {
  return (
    typeof provider === "object"
    && provider !== null
    && "request" in provider
    && typeof (provider as AcorusProvider).request === "function"
  );
}

function isAcorusAnnouncement(detail: unknown): detail is Eip6963ProviderDetail {
  if (typeof detail !== "object" || detail === null) {
    return false;
  }

  const candidate = detail as Eip6963ProviderDetail;
  const name = candidate.info?.name?.toLowerCase() ?? "";
  const rdns = candidate.info?.rdns?.toLowerCase() ?? "";

  return (
    isAcorusProvider(candidate.provider)
    && (
      candidate.provider.isAcorus === true
      || name.includes("acorus")
      || rdns.includes("acorus")
      || rdns.includes("24wallet")
    )
  );
}

function rememberAcorusProvider(event: Event): void {
  const detail = "detail" in event ? (event as CustomEvent<unknown>).detail : null;
  if (isAcorusAnnouncement(detail) && detail.provider) {
    discoveredProvider = detail.provider;
  }
}

function getAcorusProvider(): AcorusProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  const ethereum = (window as Window & { ethereum?: unknown }).ethereum;

  if (isAcorusProvider(window.acorus)) {
    return window.acorus;
  }

  if (isAcorusProvider(window.acorusEthereum)) {
    return window.acorusEthereum;
  }

  if (isAcorusProvider(ethereum) && ethereum.isAcorus === true) {
    return ethereum;
  }

  return discoveredProvider;
}

export function requestAcorusProviderDiscovery(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!discoveryListenerRegistered) {
    window.addEventListener("eip6963:announceProvider", rememberAcorusProvider);
    discoveryListenerRegistered = true;
  }

  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function hasAcorusExtension(): boolean {
  requestAcorusProviderDiscovery();
  return Boolean(getAcorusProvider());
}

export async function requestAcorusExtension<T>(
  method: string,
  params?: unknown[],
): Promise<T> {
  const provider = getAcorusProvider();

  if (!provider) {
    throw new Error("Acorus extension is not installed or not enabled in this browser profile.");
  }

  return provider.request({ method, params }) as Promise<T>;
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
