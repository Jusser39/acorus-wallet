import { getChainsByFamily, type DappWalletExposure } from "@acorus/shared";
import {
  encryptVault,
  generateWalletMnemonic,
  getEvmAddressFromMnemonic,
  validateWalletMnemonic,
  type EncryptedVaultV1,
} from "@acorus/wallet-core";
import type {
  ExtensionVaultStatus,
  ExtensionWalletCreateResult,
  ExtensionWalletImportResult,
} from "../shared/protocol";

const EXTENSION_VAULT_KEY = "acorus_extension_encrypted_vault";
const EXTENSION_VAULT_META_KEY = "acorus_extension_vault_meta";

type ExtensionVaultMeta = {
  activeProfileId: string;
  profiles: DappWalletExposure[];
  createdAt: string;
  updatedAt: string;
};

export async function createExtensionWallet(input: {
  name: string;
  passcode: string;
}): Promise<ExtensionWalletCreateResult> {
  const mnemonic = generateWalletMnemonic();
  const installed = await installExtensionWallet({
    name: input.name,
    mnemonic,
    passcode: input.passcode,
  });

  return {
    ...installed,
    mnemonic,
  };
}

export async function importExtensionWallet(input: {
  name: string;
  mnemonic: string;
  passcode: string;
}): Promise<ExtensionWalletImportResult> {
  const normalizedMnemonic = normalizeMnemonic(input.mnemonic);

  if (!validateWalletMnemonic(normalizedMnemonic)) {
    throw new Error("Invalid seed phrase.");
  }

  return installExtensionWallet({
    name: input.name,
    mnemonic: normalizedMnemonic,
    passcode: input.passcode,
  });
}

export async function getExtensionVaultStatus(): Promise<ExtensionVaultStatus> {
  const result = await chrome.storage.local.get([
    EXTENSION_VAULT_KEY,
    EXTENSION_VAULT_META_KEY,
  ]);
  const vault = result[EXTENSION_VAULT_KEY] as EncryptedVaultV1 | undefined;
  const meta = normalizeVaultMeta(result[EXTENSION_VAULT_META_KEY]);

  return {
    hasVault: Boolean(vault && meta),
    activeProfileId: meta?.activeProfileId ?? null,
    profiles: meta?.profiles ?? [],
    createdAt: meta?.createdAt ?? null,
    updatedAt: meta?.updatedAt ?? null,
  };
}

export async function getExtensionWalletProfiles(): Promise<DappWalletExposure[]> {
  return (await getExtensionVaultStatus()).profiles;
}

async function installExtensionWallet(input: {
  name: string;
  mnemonic: string;
  passcode: string;
}): Promise<ExtensionWalletImportResult> {
  const name = input.name.trim() || "Acorus Wallet";

  if (input.passcode.length < 8) {
    throw new Error("Passcode must be at least 8 characters.");
  }

  const evmAddress = getEvmAddressFromMnemonic(input.mnemonic);
  const encryptedVault = await encryptVault(
    {
      mnemonic: input.mnemonic,
      evmAddress,
      createdAt: new Date().toISOString(),
    },
    input.passcode,
  );
  const createdAt = encryptedVault.createdAt;
  const profileId = `extension_evm_${evmAddress.toLowerCase()}`;
  const profile: DappWalletExposure = {
    profileId,
    name,
    account: evmAddress,
    chainFamily: "evm",
    chainIds: getChainsByFamily("evm").map((chain) => chain.chainId),
    selected: true,
  };
  const meta: ExtensionVaultMeta = {
    activeProfileId: profileId,
    profiles: [profile],
    createdAt,
    updatedAt: createdAt,
  };

  await chrome.storage.local.set({
    [EXTENSION_VAULT_KEY]: encryptedVault,
    [EXTENSION_VAULT_META_KEY]: meta,
  });

  return {
    profileId,
    name,
    account: evmAddress,
    encryptedVault,
    warning:
      "Seed phrase was generated inside the extension and only the encrypted vault was persisted. Store the words offline now; they will not be shown again.",
  };
}

function normalizeMnemonic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeVaultMeta(value: unknown): ExtensionVaultMeta | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<ExtensionVaultMeta>;

  if (
    typeof candidate.activeProfileId !== "string"
    || !Array.isArray(candidate.profiles)
    || typeof candidate.createdAt !== "string"
    || typeof candidate.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    activeProfileId: candidate.activeProfileId,
    profiles: candidate.profiles.filter(isDappWalletExposure),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function isDappWalletExposure(value: unknown): value is DappWalletExposure {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<DappWalletExposure>;
  return (
    typeof candidate.profileId === "string"
    && typeof candidate.name === "string"
    && typeof candidate.account === "string"
    && candidate.chainFamily === "evm"
    && Array.isArray(candidate.chainIds)
    && typeof candidate.selected === "boolean"
  );
}
