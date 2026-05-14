import type { Address } from "viem";
import { createEvmPublicClient } from "./client";
import { ERC20_ABI } from "./erc20Abi";

export async function getNativeBalance(
  address: Address,
  chainId: number,
  env?: Record<string, string | undefined>,
): Promise<bigint> {
  const client = createEvmPublicClient(chainId, env);

  return client.getBalance({ address });
}

export async function getErc20Balance(
  tokenAddress: Address,
  address: Address,
  chainId: number,
  env?: Record<string, string | undefined>,
): Promise<bigint> {
  const client = createEvmPublicClient(chainId, env);

  return client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
  });
}
