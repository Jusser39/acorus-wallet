import {
  EVM_CHAINS,
  type ChainId,
  type UniversalChainConfig,
} from "@acorus/shared";
import { readStorageValue, writeStorageValue } from "./extension-storage";

export type ExtensionNetworkCapability = {
  receive: boolean;
  balance: boolean;
  send: boolean;
  swap: boolean;
  dapp: boolean;
};

export type ExtensionNetwork = UniversalChainConfig & {
  id: string;
  isCustom?: boolean;
  rpcUrl?: string | null;
  iconSymbol: string;
  accent: string;
  capabilities: ExtensionNetworkCapability;
};

export type CustomEvmNetworkInput = {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
};

const CUSTOM_EVM_NETWORKS_KEY = "acorus_custom_evm_networks";
const ACTIVE_EXTENSION_CHAIN_KEY = "acorus_active_extension_chain";
const CUSTOM_RPC_TIMEOUT_MS = 8_000;

const DEFAULT_ACCENTS: Record<string, string> = {
  "1": "#627EEA",
  "10": "#FF0420",
  "56": "#F3BA2F",
  "137": "#8247E5",
  "204": "#F0B90B",
  "250": "#1969FF",
  "324": "#8C8DFC",
  "101": "#14F195",
  "1329": "#7C3AED",
  "8453": "#0052FF",
  "42161": "#28A0F0",
  "43114": "#E84142",
  "59144": "#61DFFF",
  "tron-mainnet": "#EF0027",
  "bitcoin-mainnet": "#F7931A",
  "ton-mainnet": "#0098EA",
};

export async function listExtensionNetworks(): Promise<ExtensionNetwork[]> {
  const custom = await readStorageValue<ExtensionNetwork[]>(
    CUSTOM_EVM_NETWORKS_KEY,
    [],
  );

  const builtin: ExtensionNetwork[] = [
    ...EVM_CHAINS.map((chain) => createKnownEvmNetwork(chain)),
    {
      id: "101",
      family: "solana",
      chainId: 101,
      name: "Solana",
      nativeSymbol: "SOL",
      rpcUrlEnv: "NEXT_PUBLIC_SOLANA_RPC_URL",
      blockExplorerUrl: "https://solscan.io",
      isEnabled: true,
      network: "mainnet-beta",
      iconSymbol: "SOL",
      accent: DEFAULT_ACCENTS["101"] ?? "#14F195",
      capabilities: {
        receive: true,
        balance: true,
        send: true,
        swap: false,
        dapp: true,
      },
    },
    {
      id: "tron-mainnet",
      family: "tron",
      chainId: "tron-mainnet",
      name: "Tron",
      nativeSymbol: "TRX",
      rpcUrlEnv: "NEXT_PUBLIC_TRON_RPC_URL",
      blockExplorerUrl: "https://tronscan.org/#",
      isEnabled: false,
      isSkeleton: true,
      iconSymbol: "TRX",
      accent: DEFAULT_ACCENTS["tron-mainnet"] ?? "#EF0027",
      capabilities: {
        receive: true,
        balance: false,
        send: false,
        swap: false,
        dapp: true,
      },
    },
    {
      id: "bitcoin-mainnet",
      family: "utxo",
      chainId: "bitcoin-mainnet",
      name: "Bitcoin",
      nativeSymbol: "BTC",
      rpcUrlEnv: "NEXT_PUBLIC_BITCOIN_RPC_URL",
      blockExplorerUrl: "https://mempool.space",
      isEnabled: false,
      isSkeleton: true,
      iconSymbol: "BTC",
      accent: DEFAULT_ACCENTS["bitcoin-mainnet"] ?? "#F7931A",
      capabilities: {
        receive: false,
        balance: false,
        send: false,
        swap: false,
        dapp: false,
      },
    },
    {
      id: "ton-mainnet",
      family: "ton",
      chainId: "ton-mainnet",
      name: "TON",
      nativeSymbol: "TON",
      rpcUrlEnv: "NEXT_PUBLIC_TON_RPC_URL",
      blockExplorerUrl: "https://tonscan.org",
      isEnabled: false,
      isSkeleton: true,
      iconSymbol: "TON",
      accent: DEFAULT_ACCENTS["ton-mainnet"] ?? "#0098EA",
      capabilities: {
        receive: false,
        balance: false,
        send: false,
        swap: false,
        dapp: false,
      },
    },
  ];

  const existing = new Set(builtin.map((item) => item.id));
  return [
    ...builtin,
    ...custom.filter((item) => !existing.has(item.id)),
  ];
}

export async function getActiveExtensionChainId(): Promise<ChainId> {
  return readStorageValue<ChainId>(ACTIVE_EXTENSION_CHAIN_KEY, "all");
}

export async function setActiveExtensionChainId(
  chainId: ChainId,
): Promise<ChainId> {
  if (chainId === "all") {
    await writeStorageValue(ACTIVE_EXTENSION_CHAIN_KEY, chainId);
    return chainId;
  }

  const networks = await listExtensionNetworks();

  if (!networks.some((network) => String(network.chainId) === String(chainId))) {
    throw new Error(`Unsupported extension chain: ${String(chainId)}`);
  }

  await writeStorageValue(ACTIVE_EXTENSION_CHAIN_KEY, chainId);
  return chainId;
}

export async function addCustomEvmNetwork(
  input: CustomEvmNetworkInput,
): Promise<ExtensionNetwork> {
  validateCustomEvmNetworkInput(input);

  const builtin = (await listExtensionNetworks()).find(
    (network) =>
      network.family === "evm"
      && !network.isCustom
      && Number(network.chainId) === input.chainId,
  );

  if (builtin) {
    return builtin;
  }

  await assertRpcMatchesChainId(input.chainId, input.rpcUrls[0] ?? "");

  const custom: ExtensionNetwork = {
    id: String(input.chainId),
    family: "evm",
    chainId: input.chainId,
    name: input.chainName,
    nativeSymbol: input.nativeCurrency.symbol,
    blockExplorerUrl: input.blockExplorerUrls?.[0] ?? "",
    isEnabled: true,
    isCustom: true,
    rpcUrl: input.rpcUrls[0],
    iconSymbol: input.nativeCurrency.symbol,
    accent: "#8b5cf6",
    capabilities: {
      receive: true,
      balance: true,
      send: true,
      swap: true,
      dapp: true,
    },
  };

  const current = await readStorageValue<ExtensionNetwork[]>(
    CUSTOM_EVM_NETWORKS_KEY,
    [],
  );
  const next = [
    ...current.filter((item) => String(item.chainId) !== String(custom.chainId)),
    custom,
  ];

  await writeStorageValue(CUSTOM_EVM_NETWORKS_KEY, next);
  return custom;
}

export async function resolveExtensionNetwork(
  chainId: ChainId,
): Promise<ExtensionNetwork | null> {
  const networks = await listExtensionNetworks();
  return networks.find((network) => String(network.chainId) === String(chainId)) ?? null;
}

export function getNetworkCapabilityLabel(
  network: ExtensionNetwork,
  capability: keyof ExtensionNetworkCapability,
): string {
  return network.capabilities[capability] ? "ready" : "coming soon";
}

function createKnownEvmNetwork(input: {
  chainId: number;
  name: string;
  nativeSymbol: string;
  rpcUrlEnv: string;
  blockExplorerUrl: string;
}): ExtensionNetwork {
  return {
    id: String(input.chainId),
    family: "evm",
    chainId: input.chainId,
    name: input.name,
    nativeSymbol: input.nativeSymbol,
    rpcUrlEnv: input.rpcUrlEnv,
    blockExplorerUrl: input.blockExplorerUrl,
    isEnabled: true,
    iconSymbol: input.nativeSymbol,
    accent: DEFAULT_ACCENTS[String(input.chainId)] ?? "#8b5cf6",
    capabilities: {
      receive: true,
      balance: true,
      send: true,
      swap: true,
      dapp: true,
    },
  };
}

function validateCustomEvmNetworkInput(input: CustomEvmNetworkInput): void {
  if (!Number.isInteger(input.chainId) || input.chainId <= 0) {
    throw new Error("Custom EVM chainId must be a positive integer.");
  }

  if (!input.chainName.trim()) {
    throw new Error("Custom EVM chainName is required.");
  }

  if (input.nativeCurrency.decimals !== 18) {
    throw new Error("Only 18-decimal native EVM currencies are supported.");
  }

  if (!input.nativeCurrency.symbol || input.nativeCurrency.symbol.length > 8) {
    throw new Error("Native currency symbol must be 1-8 characters.");
  }

  const rpcUrl = input.rpcUrls[0];

  if (!rpcUrl?.startsWith("https://")) {
    throw new Error("Custom EVM network requires an HTTPS RPC URL.");
  }

  if (isPrivateRpcUrl(rpcUrl) && !isDevModeEnabled()) {
    throw new Error("Private or localhost RPC URLs are blocked outside development mode.");
  }
}

async function assertRpcMatchesChainId(
  chainId: number,
  rpcUrl: string,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CUSTOM_RPC_TIMEOUT_MS);

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error("RPC endpoint did not respond.");
  }

  const payload = await response.json() as { result?: string };
  const remote = payload.result ? Number.parseInt(payload.result, 16) : NaN;

  if (remote !== chainId) {
    throw new Error(`RPC chainId mismatch. Expected ${chainId}, got ${remote}.`);
  }
}

function isPrivateRpcUrl(rpcUrl: string): boolean {
  try {
    const hostname = new URL(rpcUrl).hostname.toLowerCase();

    if (
      hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname.endsWith(".local")
    ) {
      return true;
    }

    const parts = hostname.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
      return false;
    }

    const [first = 0, second = 0] = parts;
    return (
      first === 10
      || first === 127
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 169 && second === 254)
      || first === 0
    );
  } catch {
    return true;
  }
}

function isDevModeEnabled(): boolean {
  return false;
}
