import type { Address } from "viem";
import { createEvmPublicClient } from "./client.js";
import { ERC20_ABI } from "./erc20Abi.js";

const NAME_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export interface Erc20TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
}

export async function readErc20TokenMetadata(
  tokenAddress: Address,
  chainId: number,
  env?: Record<string, string | undefined>,
): Promise<Erc20TokenMetadata> {
  const client = createEvmPublicClient(chainId, env);

  const [symbol, name, decimals] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    client.readContract({
      address: tokenAddress,
      abi: NAME_ABI,
      functionName: "name",
    }),
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);

  return {
    symbol: symbol as string,
    name: name as string,
    decimals: decimals as number,
  };
}
