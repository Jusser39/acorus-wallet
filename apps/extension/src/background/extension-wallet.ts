import {
  DEFAULT_TRON_CHAIN_ID,
  getEvmChainConfig,
  getChainsByFamily,
  type DappWalletExposure,
  type ChainId,
} from "@acorus/shared";
import {
  createEvmPublicClient,
  createEvmWalletClient,
  deriveEvmAccountFromMnemonic,
  clearSensitiveMemoryBestEffort,
  decryptVault,
  encryptVault,
  generateWalletMnemonic,
  getEvmAddressFromMnemonic,
  validateWalletMnemonic,
  getSolanaAddressFromMnemonic,
  getTronAddressFromMnemonic,
  type EncryptedVaultV1,
} from "@acorus/wallet-core";
import type {
  ExtensionVaultStatus,
  ExtensionWalletCreateResult,
  ExtensionWalletImportResult,
} from "../shared/protocol";

const EXTENSION_VAULT_KEY = "acorus_extension_encrypted_vault";
const EXTENSION_VAULT_META_KEY = "acorus_extension_vault_meta";
const EXTENSION_EVM_RPC_FALLBACKS: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  10: "https://optimism-rpc.publicnode.com",
  56: "https://bsc-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  8453: "https://base-rpc.publicnode.com",
  42161: "https://arbitrum-one-rpc.publicnode.com",
};

let unlockedSession: {
  mnemonic: string;
  evmAddress: string;
  unlockedAt: string;
} | null = null;

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
    isUnlocked: Boolean(unlockedSession),
    activeProfileId: meta?.activeProfileId ?? null,
    profiles: meta?.profiles ?? [],
    unlockedAt: unlockedSession?.unlockedAt ?? null,
    createdAt: meta?.createdAt ?? null,
    updatedAt: meta?.updatedAt ?? null,
  };
}

export async function getExtensionWalletProfiles(): Promise<DappWalletExposure[]> {
  return (await getExtensionVaultStatus()).profiles;
}

export async function unlockExtensionWallet(input: {
  passcode: string;
}): Promise<ExtensionVaultStatus> {
  const result = await chrome.storage.local.get([
    EXTENSION_VAULT_KEY,
    EXTENSION_VAULT_META_KEY,
  ]);
  const vault = result[EXTENSION_VAULT_KEY] as EncryptedVaultV1 | undefined;
  const meta = normalizeVaultMeta(result[EXTENSION_VAULT_META_KEY]);

  if (!vault || !meta) {
    throw new Error("No extension wallet vault exists yet.");
  }

  const plaintext = await decryptVault(vault, input.passcode);
  unlockedSession = {
    mnemonic: plaintext.mnemonic,
    evmAddress: plaintext.evmAddress,
    unlockedAt: new Date().toISOString(),
  };
  clearSensitiveMemoryBestEffort(plaintext);

  return getExtensionVaultStatus();
}

export async function lockExtensionWallet(): Promise<ExtensionVaultStatus> {
  unlockedSession = clearSensitiveMemoryBestEffort(unlockedSession);
  return getExtensionVaultStatus();
}

export async function executeExtensionSignMessage(input: {
  params: unknown[];
  chainId?: ChainId | null;
  account?: string | null;
}): Promise<string> {
  const session = requireUnlockedSession();
  const account = requireUnlockedEvmAccount(session, input.account);
  const payload = extractMessagePayload(input.params);

  return account.signMessage(
    isHexString(payload)
      ? { message: { raw: payload as `0x${string}` } }
      : { message: payload },
  );
}

export async function executeExtensionSignTypedData(input: {
  params: unknown[];
  chainId?: ChainId | null;
  account?: string | null;
}): Promise<string> {
  const session = requireUnlockedSession();
  const account = requireUnlockedEvmAccount(session, input.account);
  const payload = parseTypedDataPayload(input.params);
  const signTypedData = account.signTypedData.bind(account);

  return signTypedData(payload as Parameters<typeof signTypedData>[0]);
}

export async function executeExtensionSignTransaction(input: {
  params: unknown[];
  chainId?: ChainId | null;
  account?: string | null;
}): Promise<string> {
  const prepared = await prepareExtensionTransaction(input);
  const signTransaction = prepared.walletClient.signTransaction.bind(
    prepared.walletClient,
  );

  return signTransaction({
    ...prepared.request,
    account: prepared.walletClient.account!,
    chain: prepared.walletClient.chain,
  });
}

export async function executeExtensionSendTransaction(input: {
  params: unknown[];
  chainId?: ChainId | null;
  account?: string | null;
}): Promise<string> {
  const prepared = await prepareExtensionTransaction(input);

  return prepared.walletClient.sendTransaction({
    ...prepared.request,
    account: prepared.walletClient.account!,
    chain: prepared.walletClient.chain,
  });
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
  const solanaAddress = getSolanaAddressFromMnemonic(input.mnemonic);
  const tronAddress = getTronAddressFromMnemonic(input.mnemonic);
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
  const profiles: DappWalletExposure[] = [
  {
    profileId,
    name,
    account: evmAddress,
    chainFamily: "evm",
    chainIds: getChainsByFamily("evm").map((chain) => chain.chainId),
    selected: true,
  },
  {
    profileId: `extension_solana_${solanaAddress}`,
    name: `${name} · Solana`,
    account: solanaAddress,
    chainFamily: "solana",
    chainIds: getChainsByFamily("solana").map((chain) => chain.chainId),
    selected: false,
  },
  {
    profileId: `extension_tron_${tronAddress}`,
    name: `${name} · Tron`,
    account: tronAddress,
    chainFamily: "tron",
    chainIds: [DEFAULT_TRON_CHAIN_ID],
    selected: false,
  },
  ];
  const meta: ExtensionVaultMeta = {
    activeProfileId: profileId,
    profiles,
    createdAt,
    updatedAt: createdAt,
  };

  await chrome.storage.local.set({
    [EXTENSION_VAULT_KEY]: encryptedVault,
    [EXTENSION_VAULT_META_KEY]: meta,
  });
  unlockedSession = {
    mnemonic: input.mnemonic,
    evmAddress,
    unlockedAt: new Date().toISOString(),
  };

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

function requireUnlockedSession(): NonNullable<typeof unlockedSession> {
  if (!unlockedSession) {
    throw new Error("Unlock Acorus Wallet extension before signing.");
  }

  return unlockedSession;
}

function requireUnlockedEvmAccount(
  session: NonNullable<typeof unlockedSession>,
  expectedAccount?: string | null,
) {
  const account = deriveEvmAccountFromMnemonic(session.mnemonic);

  if (
    expectedAccount
    && normalizeLowerHex(expectedAccount) !== normalizeLowerHex(account.address)
  ) {
    throw new Error("The requested account does not match the unlocked extension wallet.");
  }

  return account;
}

function extractMessagePayload(params: unknown[]): string {
  const first = params[0];
  const second = params[1];

  if (typeof first === "string" && looksLikeEvmAddress(second)) {
    return first;
  }

  if (typeof first === "string") {
    return first;
  }

  if (typeof second === "string") {
    return second;
  }

  throw new Error("Message signing requires a string payload.");
}

function parseTypedDataPayload(params: unknown[]): {
  domain?: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
} {
  const candidate =
    looksLikeEvmAddress(params[0]) && params.length > 1
      ? params[1]
      : params[0];

  const normalized =
    typeof candidate === "string"
      ? JSON.parse(candidate) as unknown
      : candidate;

  if (typeof normalized !== "object" || normalized === null) {
    throw new Error("Typed data payload must be an object.");
  }

  const payload = normalized as {
    domain?: unknown;
    types?: unknown;
    primaryType?: unknown;
    message?: unknown;
  };

  if (
    typeof payload.primaryType !== "string"
    || typeof payload.types !== "object"
    || payload.types === null
    || typeof payload.message !== "object"
    || payload.message === null
  ) {
    throw new Error("Typed data payload is missing required fields.");
  }

  return {
    domain:
      typeof payload.domain === "object" && payload.domain !== null
        ? payload.domain as Record<string, unknown>
        : {},
    types: payload.types as Record<string, Array<{ name: string; type: string }>>,
    primaryType: payload.primaryType,
    message: payload.message as Record<string, unknown>,
  };
}

async function prepareExtensionTransaction(input: {
  params: unknown[];
  chainId?: ChainId | null;
  account?: string | null;
}): Promise<{
  walletClient: ReturnType<typeof createEvmWalletClient>;
  request: Awaited<ReturnType<ReturnType<typeof createEvmPublicClient>["prepareTransactionRequest"]>>;
}> {
  const session = requireUnlockedSession();
  const account = requireUnlockedEvmAccount(session, input.account);
  const transaction = extractTransactionPayload(input.params);
  const chainId = resolveEvmChainId(transaction.chainId, input.chainId);
  const env = buildExtensionEvmEnv(chainId);
  const publicClient = createEvmPublicClient(chainId, env);
  const walletClient = createEvmWalletClient(session.mnemonic, chainId, env);

  if (
    transaction.from
    && normalizeLowerHex(transaction.from) !== normalizeLowerHex(account.address)
  ) {
    throw new Error("The transaction 'from' account does not match the unlocked extension wallet.");
  }

  const requestInput: Record<string, unknown> = { account };
  for (const [key, value] of Object.entries({
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    nonce: transaction.nonce,
    gas: transaction.gas,
    gasPrice: transaction.gasPrice,
    maxFeePerGas: transaction.maxFeePerGas,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
  })) {
    if (value !== undefined) {
      requestInput[key] = value;
    }
  }

  const request = await publicClient.prepareTransactionRequest(
    requestInput as Parameters<typeof publicClient.prepareTransactionRequest>[0],
  );

  return {
    walletClient,
    request,
  };
}

function extractTransactionPayload(params: unknown[]): {
  from?: `0x${string}`;
  to?: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  nonce?: number;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  chainId?: number;
} {
  const candidate = params[0];

  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("Transaction signing requires a transaction object.");
  }

  const payload = candidate as Record<string, unknown>;

  return {
    from: normalizeOptionalHex(payload.from),
    to: normalizeOptionalHex(payload.to),
    data: normalizeOptionalHex(payload.data),
    value: normalizeBigInt(payload.value),
    nonce: normalizeNumber(payload.nonce),
    gas: normalizeBigInt(payload.gas),
    gasPrice: normalizeBigInt(payload.gasPrice),
    maxFeePerGas: normalizeBigInt(payload.maxFeePerGas),
    maxPriorityFeePerGas: normalizeBigInt(payload.maxPriorityFeePerGas),
    chainId: normalizeNumber(payload.chainId),
  };
}

function resolveEvmChainId(
  transactionChainId: number | undefined,
  requestChainId?: ChainId | null,
): number {
  if (typeof transactionChainId === "number") {
    return transactionChainId;
  }

  if (typeof requestChainId === "number") {
    return requestChainId;
  }

  return 1;
}

function buildExtensionEvmEnv(
  chainId: number,
): Record<string, string | undefined> {
  const chain = getEvmChainConfig(chainId);
  const runtimeEnv =
    typeof process === "undefined"
      ? {}
      : process.env;

  return {
    ...runtimeEnv,
    [chain.rpcUrlEnv]:
      runtimeEnv[chain.rpcUrlEnv]
      ?? EXTENSION_EVM_RPC_FALLBACKS[chainId],
  };
}

function normalizeOptionalHex(value: unknown): `0x${string}` | undefined {
  return typeof value === "string" && isHexString(value)
    ? value as `0x${string}`
    : undefined;
}

function normalizeBigInt(value: unknown): bigint | undefined {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return BigInt(Math.trunc(value));
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return undefined;
  }

  if (/^0x[0-9a-f]+$/u.test(trimmed) || /^\d+$/u.test(trimmed)) {
    return BigInt(trimmed);
  }

  return undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return undefined;
  }

  if (/^0x[0-9a-f]+$/u.test(trimmed)) {
    return Number.parseInt(trimmed.slice(2), 16);
  }

  if (/^\d+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return undefined;
}

function isHexString(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]+$/iu.test(value);
}

function looksLikeEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/iu.test(value);
}

function normalizeLowerHex(value: string): string {
  return value.trim().toLowerCase();
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
    && (
      candidate.chainFamily === "evm"
      || candidate.chainFamily === "solana"
      || candidate.chainFamily === "tron"
      || candidate.chainFamily === "utxo"
      || candidate.chainFamily === "ton"
    )
    && Array.isArray(candidate.chainIds)
    && typeof candidate.selected === "boolean"
  );
}
