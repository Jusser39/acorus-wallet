export type EvmChainConfig = {
  chainId: number;
  name: string;
  nativeSymbol: string;
  rpcUrlEnv: string;
  blockExplorerUrl: string;
};

export const EVM_CHAINS: EvmChainConfig[] = [
  {
    chainId: 1,
    name: "Ethereum",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_ETH_RPC_URL",
    blockExplorerUrl: "https://etherscan.io",
  },
  {
    chainId: 56,
    name: "BNB Smart Chain",
    nativeSymbol: "BNB",
    rpcUrlEnv: "NEXT_PUBLIC_BSC_RPC_URL",
    blockExplorerUrl: "https://bscscan.com",
  },
  {
    chainId: 137,
    name: "Polygon",
    nativeSymbol: "MATIC",
    rpcUrlEnv: "NEXT_PUBLIC_POLYGON_RPC_URL",
    blockExplorerUrl: "https://polygonscan.com",
  },
  {
    chainId: 42161,
    name: "Arbitrum One",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_ARBITRUM_RPC_URL",
    blockExplorerUrl: "https://arbiscan.io",
  },
  {
    chainId: 10,
    name: "Optimism",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_OPTIMISM_RPC_URL",
    blockExplorerUrl: "https://optimistic.etherscan.io",
  },
  {
    chainId: 8453,
    name: "Base",
    nativeSymbol: "ETH",
    rpcUrlEnv: "NEXT_PUBLIC_BASE_RPC_URL",
    blockExplorerUrl: "https://basescan.org",
  },
];

export function getEvmChainConfig(chainId: number): EvmChainConfig {
  const chain = EVM_CHAINS.find((item) => item.chainId === chainId);

  if (!chain) {
    throw new Error(`Unsupported EVM chain: ${chainId}`);
  }

  return chain;
}
