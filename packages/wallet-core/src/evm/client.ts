import { getEvmChainConfig } from "@acorus/shared";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  fantom,
  linea,
  mainnet,
  opBNB,
  optimism,
  polygon,
  sei,
  zkSync,
} from "viem/chains";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { deriveEvmAccountFromMnemonic } from "../mnemonic";

const VIEM_CHAIN_MAP = {
  1: mainnet,
  10: optimism,
  56: bsc,
  137: polygon,
  204: opBNB,
  250: fantom,
  324: zkSync,
  1329: sei,
  8453: base,
  42161: arbitrum,
  43114: avalanche,
  59144: linea,
} as const;

export type CustomEvmChainConfig = {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  blockExplorerUrl?: string | null;
};

export type EvmClientOptions = {
  customChain?: CustomEvmChainConfig | null;
};

export function getRpcUrl(
  chainId: number,
  env: Record<string, string | undefined> = process.env,
  options?: EvmClientOptions,
): string {
  if (options?.customChain && options.customChain.chainId === chainId) {
    return options.customChain.rpcUrl;
  }

  const config = getEvmChainConfig(chainId);
  const value = env[config.rpcUrlEnv];

  if (!value) {
    throw new Error(`RPC URL is not configured for chain ${config.name}.`);
  }

  return value;
}

export function createCustomViemChain(config: CustomEvmChainConfig) {
  return defineChain({
    id: config.chainId,
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: {
      default: {
        http: [config.rpcUrl],
      },
      public: {
        http: [config.rpcUrl],
      },
    },
    blockExplorers: config.blockExplorerUrl
      ? {
          default: {
            name: `${config.name} Explorer`,
            url: config.blockExplorerUrl,
          },
        }
      : undefined,
  });
}

export function getViemChain(chainId: number, options?: EvmClientOptions) {
  if (options?.customChain && options.customChain.chainId === chainId) {
    return createCustomViemChain(options.customChain);
  }

  const chain = VIEM_CHAIN_MAP[chainId as keyof typeof VIEM_CHAIN_MAP];

  if (!chain) {
    throw new Error(`Unsupported EVM chain: ${chainId}`);
  }

  return chain;
}

export function createEvmPublicClient(
  chainId: number,
  env?: Record<string, string | undefined>,
  options?: EvmClientOptions,
) {
  return createPublicClient({
    chain: getViemChain(chainId, options),
    transport: http(getRpcUrl(chainId, env, options)),
  });
}

export function createEvmWalletClient(
  mnemonic: string,
  chainId: number,
  env?: Record<string, string | undefined>,
  options?: EvmClientOptions,
) {
  const account = deriveEvmAccountFromMnemonic(mnemonic);

  return createWalletClient({
    account,
    chain: getViemChain(chainId, options),
    transport: http(getRpcUrl(chainId, env, options)),
  });
}
