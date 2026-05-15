import type { ChainFamily } from "./types";

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

export type SupportedChainConfig = EvmChainConfig | SolanaChainConfig;

export const DEFAULT_EVM_CHAIN_ID = 1;
export const DEFAULT_SOLANA_CHAIN_ID = 101;

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
  chainId: number,
  address?: string | null,
): string {
  const trimmed = (address ?? "").trim();

  if (!trimmed) {
    return "";
  }

  return isEvmChainId(chainId) ? trimmed.toLowerCase() : trimmed;
}

export function getExplorerTxUrl(chainId: number, hash: string): string {
  const chain = getChainById(chainId);

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return `${chain.blockExplorerUrl}/tx/${hash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const chain = getChainById(chainId);

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  if (chain.family === "solana") {
    return `${chain.blockExplorerUrl}/account/${address}`;
  }

  return `${chain.blockExplorerUrl}/address/${address}`;
}
