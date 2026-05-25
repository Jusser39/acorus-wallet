import "./node-globals";
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
  getWalletMnemonicValidation,
  getEvmAddressFromMnemonic,
  getSolanaAddressFromMnemonic,
  getTronAddressFromMnemonic,
  executeSplTransfer,
  executeSolanaSend,
  signSolanaMessage,
  type CustomEvmChainConfig,
  type EncryptedVaultV1,
  type SolanaSendExecutionInput,
  type SplTransferExecutionInput,
} from "@acorus/wallet-core";
import type {
  ExtensionVaultStatus,
  ExtensionWalletCreateResult,
  ExtensionWalletImportResult,
} from "../shared/protocol";
import { resolveExtensionNetwork } from "./extension-chain-registry";

const EXTENSION_VAULT_KEY = "acorus_extension_encrypted_vault";
const EXTENSION_VAULT_META_KEY = "acorus_extension_vault_meta";
const EXTENSION_EVM_RPC_FALLBACKS: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  10: "https://optimism-rpc.publicnode.com",
  56: "https://bsc-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  204: "https://opbnb-rpc.publicnode.com",
  250: "https://fantom-rpc.publicnode.com",
  324: "https://zksync-era-rpc.publicnode.com",
  1329: "https://sei-evm-rpc.publicnode.com",
  8453: "https://base-rpc.publicnode.com",
  42161: "https://arbitrum-one-rpc.publicnode.com",
  43114: "https://avalanche-c-chain-rpc.publicnode.com",
  59144: "https://linea-rpc.publicnode.com",
};
const EXTENSION_SOLANA_RPC_FALLBACK = "https://api.mainnet-beta.solana.com";

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
  passcodeInitialized: boolean;
  passcodeMode: "user" | "pin" | "random";
  passcodeSetupConfirmedAt: string;
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
  const validation = getWalletMnemonicValidation(input.mnemonic);

  if (!validation.importable) {
    throw new Error(
      "Invalid seed phrase. Paste 12/18/24 BIP-39 words only, separated by spaces.",
    );
  }

  return installExtensionWallet({
    name: input.name,
    mnemonic: validation.normalized,
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

export async function resetExtensionWallet(): Promise<ExtensionVaultStatus> {
  unlockedSession = clearSensitiveMemoryBestEffort(unlockedSession);
  await chrome.storage.local.set({
    [EXTENSION_VAULT_KEY]: null,
    [EXTENSION_VAULT_META_KEY]: null,
  });

  return getExtensionVaultStatus();
}

export async function executeExtensionSignMessage(input: {
  params: unknown[];
  chainId?: ChainId | null;
  account?: string | null;
}): Promise<string> {
  const session = requireUnlockedSession();

  if (isSolanaSignMessageParams(input.params)) {
    return signSolanaMessage({
      mnemonic: session.mnemonic,
      message: input.params[0].message,
    });
  }

  const account = requireUnlockedEvmAccount(session, input.account);
  const payload = extractMessagePayload(input.params);

  return account.signMessage(
    isHexString(payload)
      ? { message: { raw: payload as `0x${string}` } }
      : { message: payload },
  );
}

export async function executeExtensionSolanaSend(input: {
  params: unknown[];
  account?: string | null;
}): Promise<string> {
  const session = requireUnlockedSession();
  const payload = parseSolanaSendPayload(input.params);
  const result = payload.assetType === "spl"
    ? await executeSplTransfer({
      mintAddress: payload.tokenAddress,
      fromOwnerAddress: payload.fromAddress,
      toOwnerAddress: payload.toAddress,
      amountRaw: payload.amountRaw,
      amountFormatted: payload.amountFormatted,
      decimals: payload.decimals,
      symbol: payload.symbol,
      balanceRaw: payload.balanceRaw,
      mnemonic: session.mnemonic,
      expectedFromAddress: input.account ?? payload.fromAddress,
      rpcUrl: payload.rpcUrl ?? EXTENSION_SOLANA_RPC_FALLBACK,
    })
    : await executeSolanaSend({
      fromAddress: payload.fromAddress,
      toAddress: payload.toAddress,
      amountRaw: payload.amountRaw,
      amountFormatted: payload.amountFormatted,
      mnemonic: session.mnemonic,
      expectedFromAddress: input.account ?? payload.fromAddress,
      rpcUrl: payload.rpcUrl ?? EXTENSION_SOLANA_RPC_FALLBACK,
    });

  if (result.status !== "submitted" || !result.txHash) {
    throw new Error(result.errorMessage ?? "Solana send was not submitted.");
  }

  return result.txHash;
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
  const passcodeMode = requireExtensionPasscodeMode(input.passcode);

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
    passcodeInitialized: true,
    passcodeMode,
    passcodeSetupConfirmedAt: new Date().toISOString(),
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
  const clientOptions = await buildExtensionEvmClientOptions(chainId);
  const publicClient = createEvmPublicClient(chainId, env, clientOptions);
  const walletClient = createEvmWalletClient(
    session.mnemonic,
    chainId,
    env,
    clientOptions,
  );

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
  const runtimeEnv =
    typeof process === "undefined"
      ? {}
      : process.env;

  let chain: ReturnType<typeof getEvmChainConfig>;
  try {
    chain = getEvmChainConfig(chainId);
  } catch {
    return {
      ...runtimeEnv,
    };
  }

  return {
    ...runtimeEnv,
    [chain.rpcUrlEnv]:
      runtimeEnv[chain.rpcUrlEnv]
      ?? EXTENSION_EVM_RPC_FALLBACKS[chainId],
  };
}

function isSolanaSignMessageParams(
  params: unknown[],
): params is [{ family: "solana"; message: string | number[] | Uint8Array }] {
  const first = params[0];

  if (typeof first !== "object" || first === null) {
    return false;
  }

  const payload = first as { family?: unknown; message?: unknown };
  return (
    payload.family === "solana"
    && (
      typeof payload.message === "string"
      || Array.isArray(payload.message)
      || payload.message instanceof Uint8Array
    )
  );
}

type ParsedSolanaSendPayload = (
  Omit<SolanaSendExecutionInput, "mnemonic">
  & {
    assetType: "native";
    symbol: "SOL";
    tokenAddress: null;
    decimals: 9;
    balanceRaw?: string | null;
  }
) | (
  Omit<SplTransferExecutionInput, "mnemonic" | "fromOwnerAddress" | "toOwnerAddress" | "mintAddress">
  & {
    assetType: "spl";
    fromAddress: string;
    toAddress: string;
    tokenAddress: string;
    symbol: string;
    decimals: number;
  }
);

function parseSolanaSendPayload(params: unknown[]): ParsedSolanaSendPayload {
  const payload = normalizeRecord(params[0]);
  const assetType = payload.assetType === "spl" ? "spl" : "native";
  const fromAddress = String(payload.fromAddress ?? payload.from ?? "");
  const toAddress = String(payload.toAddress ?? payload.to ?? "");
  const amountRaw = typeof payload.amountRaw === "string"
    ? payload.amountRaw
    : undefined;
  const amountFormatted = typeof payload.amountFormatted === "string"
    ? payload.amountFormatted
    : typeof payload.amount === "string"
      ? payload.amount
      : undefined;
  const rpcUrl = typeof payload.rpcUrl === "string"
    ? payload.rpcUrl
    : undefined;
  const expectedFromAddress = typeof payload.expectedFromAddress === "string"
    ? payload.expectedFromAddress
    : null;

  if (assetType === "spl") {
    return {
      assetType,
      fromAddress,
      toAddress,
      amountRaw,
      amountFormatted,
      rpcUrl,
      expectedFromAddress,
      tokenAddress: String(payload.tokenAddress ?? payload.mintAddress ?? ""),
      symbol: typeof payload.symbol === "string" ? payload.symbol : "SPL",
      decimals: normalizeNumber(payload.decimals) ?? 0,
      balanceRaw: typeof payload.balanceRaw === "string" ? payload.balanceRaw : null,
    };
  }

  return {
    assetType,
    symbol: "SOL",
    tokenAddress: null,
    decimals: 9,
    fromAddress,
    toAddress,
    amountRaw,
    amountFormatted,
    rpcUrl,
    expectedFromAddress,
    balanceRaw: typeof payload.balanceRaw === "string" ? payload.balanceRaw : null,
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

async function buildExtensionEvmClientOptions(
  chainId: number,
): Promise<{ customChain?: CustomEvmChainConfig | null } | undefined> {
  try {
    getEvmChainConfig(chainId);
    return undefined;
  } catch {
    const network = await resolveExtensionNetwork(chainId);

    if (!network || network.family !== "evm" || !network.rpcUrl) {
      return undefined;
    }

    return {
      customChain: {
        chainId,
        name: network.name,
        nativeCurrency: {
          name: network.nativeSymbol,
          symbol: network.nativeSymbol,
          decimals: 18,
        },
        rpcUrl: network.rpcUrl,
        blockExplorerUrl: network.blockExplorerUrl || null,
      },
    };
  }
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
    || candidate.passcodeInitialized !== true
    || (
      candidate.passcodeMode !== "user"
      && candidate.passcodeMode !== "pin"
      && candidate.passcodeMode !== "random"
    )
    || typeof candidate.passcodeSetupConfirmedAt !== "string"
  ) {
    return null;
  }

  return {
    activeProfileId: candidate.activeProfileId,
    profiles: candidate.profiles.filter(isDappWalletExposure),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    passcodeInitialized: true,
    passcodeMode: candidate.passcodeMode,
    passcodeSetupConfirmedAt: candidate.passcodeSetupConfirmedAt,
  };
}

function requireExtensionPasscodeMode(passcode: string): ExtensionVaultMeta["passcodeMode"] {
  const normalized = passcode.trim();

  if (normalized.length >= 8) {
    return "user";
  }

  throw new Error("Choose a wallet password with at least 8 characters.");
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
