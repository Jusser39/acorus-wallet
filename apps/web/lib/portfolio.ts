"use client";

import type { FiatCurrency, MarketPrice, UserToken } from "./api";
import { getMarketPrices, listUserTokens } from "./api";
import { EVM_CHAINS, getCuratedTokens, type WalletProfileRecord } from "@acorus/shared";
import { getErc20Balance, getNativeBalance } from "@acorus/wallet-core";
import { formatUnits } from "viem";
import { getPracticeNativeBalance, getPracticeTokens } from "./practice";

export interface PortfolioAssetView {
  chainId: number;
  type: "native" | "erc20" | "practice";
  tokenAddress?: string | null;
  symbol: string;
  name: string;
  decimals: number;
  balanceFormatted: string;
  fiatValue: number | null;
  change24hPercent: number | null;
  logoUrl?: string | null;
  isVerified: boolean;
  isHidden: boolean;
  // Market data fields
  provider?: string | null;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: string | null;
  riskFlagsJson?: string | null;
}

export interface PortfolioSummaryView {
  currency: FiatCurrency;
  totalValue: number;
  change24hPercent: number | null;
  assets: PortfolioAssetView[];
  updatedAt: string;
}

function calcFiatValue(balance: string, price: number): number {
  const parsed = parseFloat(balance);
  if (isNaN(parsed)) return 0;
  return parsed * price;
}

export async function loadEvmPortfolioSummary(
  profile: Pick<WalletProfileRecord, "publicAddress" | "type" | "id">,
  chainId: number,
  userId: string,
  currency: FiatCurrency,
): Promise<PortfolioSummaryView> {
  const now = new Date().toISOString();

  if (profile.type === "practice") {
    return loadPracticePortfolioSummary(chainId, currency, now);
  }

  const address = profile.publicAddress as `0x${string}`;

  const curatedTokens = getCuratedTokens(chainId);
  let customTokens: UserToken[] = [];
  try {
    customTokens = await listUserTokens({ userId, walletProfileId: profile.id });
  } catch {
    // non-fatal
  }

  const allTokens = [
    ...curatedTokens.map((t) => ({
      tokenAddress: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoUrl: t.logoUrl,
      isVerified: t.verified,
      isHidden: false,
    })),
    ...customTokens
      .filter((t) => t.chainId === chainId)
      .map((t) => ({
        tokenAddress: t.tokenAddress,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoUrl: t.logoUrl ?? null,
        isVerified: t.isVerified,
        isHidden: t.isHidden,
      })),
  ];

  // Dedupe by tokenAddress
  const seen = new Set<string>();
  const uniqueTokens = allTokens.filter((t) => {
    const key = t.tokenAddress.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Fetch balances
  const [nativeRaw, tokenBalances] = await Promise.all([
    getNativeBalance(address, chainId).catch(() => 0n),
    Promise.all(
      uniqueTokens.map(async (token) => {
        const raw = await getErc20Balance(
          token.tokenAddress as `0x${string}`,
          address,
          chainId,
        ).catch(() => 0n);
        return { ...token, balanceFormatted: formatUnits(raw, token.decimals) };
      }),
    ),
  ]);

  const nativeBigInt = typeof nativeRaw === "bigint" ? nativeRaw : BigInt(nativeRaw);
  const nativeFormatted = formatUnits(nativeBigInt, 18);

  const chain = EVM_CHAINS.find((c) => c.chainId === chainId);
  const nativeSymbol = chain?.nativeSymbol ?? "ETH";
  const chainName = chain?.name ?? `Chain ${chainId}`;

  // Fetch prices
  const allSymbols = [nativeSymbol, ...uniqueTokens.map((t) => t.symbol)];
  const uniqueSymbols = [...new Set(allSymbols)];

  let prices: MarketPrice[] = [];
  try {
    prices = await getMarketPrices({ chainId, currency, symbols: uniqueSymbols });
  } catch {
    // non-fatal
  }

  const priceMap = new Map(prices.map((p) => [p.symbol.toUpperCase(), p]));

  const nativePrice = priceMap.get(nativeSymbol.toUpperCase());
  const nativeFiatValue = nativePrice ? calcFiatValue(nativeFormatted, nativePrice.price) : null;

  const nativeAsset: PortfolioAssetView = {
    chainId,
    type: "native",
    symbol: nativeSymbol,
    name: chainName,
    decimals: 18,
    balanceFormatted: nativeFormatted,
    fiatValue: nativeFiatValue,
    change24hPercent: nativePrice?.change24h?.percent ?? null,
    logoUrl: null,
    isVerified: true,
    isHidden: false,
    provider: nativePrice?.provider ?? null,
    sourceStatus: nativePrice?.sourceStatus ?? null,
    liquidityUsd: nativePrice?.liquidityUsd ?? null,
    pairUrl: nativePrice?.pairUrl ?? null,
    riskLevel: nativePrice?.riskLevel ?? null,
    riskFlagsJson: nativePrice?.riskFlagsJson ?? null,
  };

  const tokenAssets: PortfolioAssetView[] = tokenBalances
    .filter((t) => !t.isHidden)
    .map((token) => {
      const price = priceMap.get(token.symbol.toUpperCase());
      return {
        chainId,
        type: "erc20" as const,
        tokenAddress: token.tokenAddress,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balanceFormatted: token.balanceFormatted,
        fiatValue: price ? calcFiatValue(token.balanceFormatted, price.price) : null,
        change24hPercent: price?.change24h?.percent ?? null,
        logoUrl: token.logoUrl,
        isVerified: token.isVerified,
        isHidden: false,
        provider: price?.provider ?? null,
        sourceStatus: price?.sourceStatus ?? null,
        liquidityUsd: price?.liquidityUsd ?? null,
        pairUrl: price?.pairUrl ?? null,
        riskLevel: price?.riskLevel ?? null,
        riskFlagsJson: price?.riskFlagsJson ?? null,
      };
    });

  const assets = [nativeAsset, ...tokenAssets];
  const totalValue = assets.reduce((sum, a) => sum + (a.fiatValue ?? 0), 0);

  // Weighted average 24h change
  let change24hPercent: number | null = null;
  const assetsWithValue = assets.filter((a) => a.fiatValue != null && a.fiatValue > 0);
  if (assetsWithValue.length > 0 && totalValue > 0) {
    const weighted = assetsWithValue.reduce(
      (sum, a) => sum + (a.change24hPercent ?? 0) * (a.fiatValue ?? 0),
      0,
    );
    change24hPercent = weighted / totalValue;
  }

  return { currency, totalValue, change24hPercent, assets, updatedAt: now };
}

function loadPracticePortfolioSummary(
  chainId: number,
  currency: FiatCurrency,
  now: string,
): PortfolioSummaryView {
  const chain = EVM_CHAINS.find((c) => c.chainId === chainId);
  const nativeSymbol = chain?.nativeSymbol ?? "ETH";

  const nativeBalance = getPracticeNativeBalance(chainId);
  const practiceTokens = getPracticeTokens(chainId);

  const assets: PortfolioAssetView[] = [
    {
      chainId,
      type: "practice",
      symbol: nativeSymbol,
      name: "Practice " + (chain?.name ?? "Chain"),
      decimals: 18,
      balanceFormatted: nativeBalance,
      fiatValue: null,
      change24hPercent: null,
      logoUrl: null,
      isVerified: true,
      isHidden: false,
    },
    ...practiceTokens.map((t) => ({
      chainId,
      type: "practice" as const,
      tokenAddress: t.tokenAddress,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      balanceFormatted: t.balance,
      fiatValue: null,
      change24hPercent: null,
      logoUrl: null,
      isVerified: true,
      isHidden: false,
    })),
  ];

  return {
    currency,
    totalValue: 0,
    change24hPercent: null,
    assets,
    updatedAt: now,
  };
}
