import type { ChainFamily, ChainId, ChainRef } from "./multichain";

export type EvmChainConfig = {
  chainId: number;
  family: "evm";
  name: string;
  nativeSymbol: string;
  rpcUrlEnv: string;
  blockExplorerUrl: string;
};

export type SolanaChainConfig = {
  chainId: number;
  family: "solana";
  name: string;
  network: "mainnet-beta" | "devnet" | "testnet";
  nativeSymbol: "SOL";
  rpcUrlEnv: string;
  blockExplorerUrl: string;
};

export type UniversalChainConfig = ChainRef & {
  rpcUrlEnv?: string;
  blockExplorerUrl: string;
  isEnabled: boolean;
  isSkeleton?: boolean;
  network?: "mainnet-beta" | "devnet" | "testnet";
};

export type SupportedChainConfig = EvmChainConfig | SolanaChainConfig;

export const DEFAULT_EVM_CHAIN_ID = 1;
export const DEFAULT_SOLANA_CHAIN_ID = 101;
export const DEFAULT_TRON_CHAIN_ID = "tron-mainnet";
export const DEFAULT_BITCOIN_CHAIN_ID = "bitcoin-mainnet";

export const EVM_CHAINS: EvmChainConfig[] = [
  {
    chainId: 1,
    family: "evm",
    name: "Ethereum",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_ETH_RPC_URL",
    blockExplorerUrl: "https://etherscan.io",
  },
  {
    chainId: 56,
    family: "evm",
    name: "BNB Smart Chain",
    nativeSymbol: "BNB",
    rpcUrlEnv: "NEXT_PUBLIC_BSC_RPC_URL",
    blockExplorerUrl: "https://bscscan.com",
  },
  {
    chainId: 137,
    family: "evm",
    name: "Polygon",
    nativeSymbol: "MATIC",
    rpcUrlEnv: "NEXT_PUBLIC_POLYGON_RPC_URL",
    blockExplorerUrl: "https://polygonscan.com",
  },
  {
    chainId: 42161,
    family: "evm",
    name: "Arbitrum One",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_ARBITRUM_RPC_URL",
    blockExplorerUrl: "https://arbiscan.io",
  },
  {
    chainId: 10,
    family: "evm",
    name: "Optimism",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_OPTIMISM_RPC_URL",
    blockExplorerUrl: "https://optimistic.etherscan.io",
  },
  {
    chainId: 8453,
    family: "evm",
    name: "Base",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_BASE_RPC_URL",
    blockExplorerUrl: "https://basescan.org",
  },
];

export const SOLANA_MAINNET_CHAIN: SolanaChainConfig = {
  chainId: DEFAULT_SOLANA_CHAIN_ID,
  family: "solana",
  name: "Solana",
  network: "mainnet-beta",
  nativeSymbol: "SOL",
  rpcUrlEnv: "NEXT_PUBLIC_SOLANA_RPC_URL",
  blockExplorerUrl: "https://solscan.io",
};

export const SOLANA_CHAINS: SolanaChainConfig[] = [SOLANA_MAINNET_CHAIN];

export const TRON_MAINNET_CHAIN: UniversalChainConfig = {
  family: "tron",
  chainId: DEFAULT_TRON_CHAIN_ID,
  name: "Tron",
  nativeSymbol: "TRX",
  rpcUrlEnv: "NEXT_PUBLIC_TRON_RPC_URL",
  blockExplorerUrl: "https://tronscan.org/#",
  isEnabled: false,
  isSkeleton: true,
};

export const BITCOIN_MAINNET_CHAIN: UniversalChainConfig = {
  family: "utxo",
  chainId: DEFAULT_BITCOIN_CHAIN_ID,
  name: "Bitcoin",
  nativeSymbol: "BTC",
  rpcUrlEnv: "NEXT_PUBLIC_BITCOIN_RPC_URL",
  blockExplorerUrl: "https://mempool.space",
  isEnabled: false,
  isSkeleton: true,
};

export const UNIVERSAL_CHAINS: UniversalChainConfig[] = [
  ...EVM_CHAINS.map((chain) => ({
    family: "evm" as const,
    chainId: chain.chainId,
    name: chain.name,
    nativeSymbol: chain.nativeSymbol,
    rpcUrlEnv: chain.rpcUrlEnv,
    blockExplorerUrl: chain.blockExplorerUrl,
    isEnabled: true,
  })),
  {
    family: SOLANA_MAINNET_CHAIN.family,
    chainId: SOLANA_MAINNET_CHAIN.chainId,
    name: SOLANA_MAINNET_CHAIN.name,
    nativeSymbol: SOLANA_MAINNET_CHAIN.nativeSymbol,
    rpcUrlEnv: SOLANA_MAINNET_CHAIN.rpcUrlEnv,
    blockExplorerUrl: SOLANA_MAINNET_CHAIN.blockExplorerUrl,
    network: SOLANA_MAINNET_CHAIN.network,
    isEnabled: true,
  },
  TRON_MAINNET_CHAIN,
  BITCOIN_MAINNET_CHAIN,
];

export function getEvmChainConfig(chainId: number): EvmChainConfig {
  const chain = EVM_CHAINS.find((item) => item.chainId === chainId);

  if (!chain) {
    throw new Error(`Unsupported EVM chain: ${chainId}`);
  }

  return chain;
}

export function getSolanaChainConfig(chainId: number): SolanaChainConfig {
  const chain = SOLANA_CHAINS.find((item) => item.chainId === chainId);

  if (!chain) {
    throw new Error(`Unsupported Solana chain: ${chainId}`);
  }

  return chain;
}

export function getChainById(chainId: number): SupportedChainConfig | undefined {
  return EVM_CHAINS.find((item) => item.chainId === chainId)
    ?? SOLANA_CHAINS.find((item) => item.chainId === chainId);
}

export function getUniversalChain(input: {
  family?: ChainFamily;
  chainId: ChainId;
}): UniversalChainConfig | undefined {
  return UNIVERSAL_CHAINS.find((chain) =>
    String(chain.chainId) === String(input.chainId)
    && (!input.family || chain.family === input.family),
  );
}

export function getEnabledUniversalChains(): UniversalChainConfig[] {
  return UNIVERSAL_CHAINS.filter((chain) => chain.isEnabled);
}

export function getUniversalChainsByFamily(family: ChainFamily): UniversalChainConfig[] {
  return UNIVERSAL_CHAINS.filter((chain) => chain.family === family);
}

export function getChainsByFamily(family: ChainFamily): SupportedChainConfig[] {
  if (family === "evm") {
    return EVM_CHAINS;
  }

  if (family === "solana") {
    return SOLANA_CHAINS;
  }

  return [];
}

export function getDefaultChainIdForFamily(family: ChainFamily): number {
  if (family === "solana") {
    return DEFAULT_SOLANA_CHAIN_ID;
  }

  return DEFAULT_EVM_CHAIN_ID;
}

export function isEvmChainId(chainId: number): boolean {
  return EVM_CHAINS.some((item) => item.chainId === chainId);
}

export function isSolanaChainId(chainId: number): boolean {
  return SOLANA_CHAINS.some((item) => item.chainId === chainId);
}

export function normalizeAddressForChain(
  chainId: ChainId,
  address?: string | null,
): string {
  const trimmed = (address ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const chain =
    typeof chainId === "number"
      ? getChainById(chainId) ?? getUniversalChain({ chainId })
      : getUniversalChain({ chainId });

  return chain?.family === "evm" ? trimmed.toLowerCase() : trimmed;
}

export function getExplorerTxUrl(chainId: ChainId, hash: string): string {
  const chain =
    typeof chainId === "number"
      ? getChainById(chainId) ?? getUniversalChain({ chainId })
      : getUniversalChain({ chainId });

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  if (chain.family === "tron") {
    return `${chain.blockExplorerUrl}/transaction/${hash}`;
  }

  return `${chain.blockExplorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(chainId: ChainId, address: string): string {
  const chain =
    typeof chainId === "number"
      ? getChainById(chainId) ?? getUniversalChain({ chainId })
      : getUniversalChain({ chainId });

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  if (chain.family === "solana") {
    return `${chain.blockExplorerUrl}/account/${address}`;
  }

  if (chain.family === "tron") {
    return `${chain.blockExplorerUrl}/address/${address}`;
  }

  return `${chain.blockExplorerUrl}/address/${address}`;
}
