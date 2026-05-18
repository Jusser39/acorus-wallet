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
import { createPublicClient, createWalletClient, http } from "viem";
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

export function getRpcUrl(
  chainId: number,
  env: Record<string, string | undefined> = process.env,
): string {
  const config = getEvmChainConfig(chainId);
  const value = env[config.rpcUrlEnv];

  if (!value) {
    throw new Error(`RPC URL is not configured for chain ${config.name}.`);
  }

  return value;
}

export function getViemChain(chainId: number) {
  const chain = VIEM_CHAIN_MAP[chainId as keyof typeof VIEM_CHAIN_MAP];

  if (!chain) {
    throw new Error(`Unsupported EVM chain: ${chainId}`);
  }

  return chain;
}

export function createEvmPublicClient(
  chainId: number,
  env?: Record<string, string | undefined>,
) {
  return createPublicClient({
    chain: getViemChain(chainId),
    transport: http(getRpcUrl(chainId, env)),
  });
}

export function createEvmWalletClient(
  mnemonic: string,
  chainId: number,
  env?: Record<string, string | undefined>,
) {
  const account = deriveEvmAccountFromMnemonic(mnemonic);

  return createWalletClient({
    account,
    chain: getViemChain(chainId),
    transport: http(getRpcUrl(chainId, env)),
  });
}
