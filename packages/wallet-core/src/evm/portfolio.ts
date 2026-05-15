import type { Address } from "viem";
import { formatUnits } from "viem";
import { getNativeBalance, getErc20Balance } from "./balance.js";

export interface PortfolioToken {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
}

export interface NativePortfolioBalance {
  balanceRaw: string;
  balanceFormatted: string;
}

export async function getEvmNativeBalance(
  address: Address,
  chainId: number,
  env?: Record<string, string | undefined>,
): Promise<NativePortfolioBalance> {
  const raw = await getNativeBalance(address, chainId, env);
  return {
    balanceRaw: raw.toString(),
    balanceFormatted: formatUnits(raw, 18),
  };
}

export async function getEvmTokenBalance(
  tokenAddress: Address,
  walletAddress: Address,
  decimals: number,
  chainId: number,
  env?: Record<string, string | undefined>,
): Promise<{ balanceRaw: string; balanceFormatted: string }> {
  const raw = await getErc20Balance(tokenAddress, walletAddress, chainId, env);
  return {
    balanceRaw: raw.toString(),
    balanceFormatted: formatUnits(raw, decimals),
  };
}
