"use client";

import { getCuratedTokens, type TokenMetadataItem, type WalletProfileRecord } from "@acorus/shared";
import { getErc20Balance, getNativeBalance } from "@acorus/wallet-core";
import { formatUnits, parseUnits } from "viem";
import { listTokens } from "./api";
import { getPracticeNativeBalance, getPracticeTokens } from "./practice";

export interface TokenBalanceView {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceRaw: bigint;
}

export interface WalletAssetSnapshot {
  nativeBalance: string;
  nativeBalanceRaw: bigint;
  tokens: TokenBalanceView[];
}

function toFallbackTokens(chainId: number): TokenMetadataItem[] {
  const timestamp = new Date(0).toISOString();

  return getCuratedTokens(chainId).map((token) => ({
    id: `${token.chainId}:${token.address.toLowerCase()}`,
    chainId: token.chainId,
    tokenAddress: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logoUrl: token.logoUrl,
    isVerified: token.verified,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export async function loadWalletAssetSnapshot(
  profile: Pick<WalletProfileRecord, "type" | "publicAddress">,
  chainId: number,
): Promise<WalletAssetSnapshot> {
  if (profile.type === "practice") {
    const nativeBalance = getPracticeNativeBalance(chainId);
    const tokens = getPracticeTokens(chainId).map((token) => ({
      tokenAddress: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balance: token.balance,
      balanceRaw: parseUnits(token.balance, token.decimals),
    }));

    return {
      nativeBalance,
      nativeBalanceRaw: parseUnits(nativeBalance, 18),
      tokens,
    };
  }

  const tokens = await listTokens(chainId).catch(() => toFallbackTokens(chainId));
  const [nativeBalanceRaw, tokenBalances] = await Promise.all([
    getNativeBalance(profile.publicAddress as `0x${string}`, chainId),
    Promise.all(
      tokens.map(async (token) => {
        const balanceRaw = await getErc20Balance(
          token.tokenAddress as `0x${string}`,
          profile.publicAddress as `0x${string}`,
          chainId,
        );

        return {
          tokenAddress: token.tokenAddress,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: formatUnits(balanceRaw, token.decimals),
          balanceRaw,
        };
      }),
    ),
  ]);

  return {
    nativeBalance: formatUnits(nativeBalanceRaw, 18),
    nativeBalanceRaw,
    tokens: tokenBalances,
  };
}
