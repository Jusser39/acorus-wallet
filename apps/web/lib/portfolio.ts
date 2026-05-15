"use client";

import type { FiatCurrency, MarketPrice, UserToken } from "./api";
import { getMarketPrices, listUserTokens } from "./api";
import {
  getChainById,
  getCuratedTokens,
  normalizeAddressForChain,
  type WalletProfileRecord,
} from "@acorus/shared";
import {
  getErc20Balance,
  getNativeBalance,
  getSolanaPortfolioBalances,
} from "@acorus/wallet-core";
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
  isCustom?: boolean;
  provider?: string | null;
  sourceStatus?: string | null;
  liquidityUsd?: number | null;
  pairUrl?: string | null;
  riskLevel?: string | null;
  riskFlags?: string[];
  riskFlagsJson?: string | null;
}

export interface PortfolioSummaryView {
  currency: FiatCurrency;
  totalValue: number;
  change24hPercent: number | null;
  assets: PortfolioAssetView[];
  updatedAt: string;
}

type TokenCandidate = {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  isVerified: boolean;
  isHidden: boolean;
  isCustom: boolean;
};

function calcFiatValue(balance: string, price: number): number {
  const parsed = parseFloat(balance);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed * price;
}

function tokenKey(chainId: number, tokenAddress?: string | null): string {
  return `${chainId}:${normalizeAddressForChain(chainId, tokenAddress)}`;
}

function marketKey(
  chainId: number,
  symbol: string,
  tokenAddress?: string | null,
): string {
  return `${chainId}:${normalizeAddressForChain(chainId, tokenAddress)}:${symbol.toUpperCase()}`;
}

function parseRiskFlags(price?: Pick<MarketPrice, "riskFlags" | "riskFlagsJson"> | null): string[] {
  if (price?.riskFlags?.length) {
    return price.riskFlags;
  }

  if (!price?.riskFlagsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(price.riskFlagsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function resolvePrice(
  priceMap: Map<string, MarketPrice>,
  chainId: number,
  symbol: string,
  tokenAddress?: string | null,
): MarketPrice | undefined {
  return (
    priceMap.get(marketKey(chainId, symbol, tokenAddress))
    ?? priceMap.get(marketKey(chainId, symbol, null))
  );
}

function buildVisibleTokens(chainId: number, userTokens: UserToken[]): TokenCandidate[] {
  const chainUserTokens = userTokens.filter((token) => token.chainId === chainId);
  const hiddenTokenKeys = new Set(
    chainUserTokens
      .filter((token) => token.isHidden)
      .map((token) => tokenKey(chainId, token.tokenAddress)),
  );

  const curatedTokens = getCuratedTokens(chainId)
    .filter((token) => !hiddenTokenKeys.has(tokenKey(chainId, token.address)))
    .map<TokenCandidate>((token) => ({
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoUrl: token.logoUrl,
      isVerified: token.verified,
      isHidden: false,
      isCustom: false,
    }));

  const visibleCustomTokens = chainUserTokens
    .filter((token) => token.isCustom && !token.isHidden)
    .map<TokenCandidate>((token) => ({
      tokenAddress: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoUrl: token.logoUrl ?? null,
      isVerified: token.isVerified,
      isHidden: false,
      isCustom: true,
    }));

  const merged = new Map<string, TokenCandidate>();
  for (const token of [...curatedTokens, ...visibleCustomTokens]) {
    const key = tokenKey(chainId, token.tokenAddress);
    if (!merged.has(key)) {
      merged.set(key, token);
    }
  }

  return [...merged.values()];
}

function calculateWeightedChange(assets: PortfolioAssetView[], totalValue: number): number | null {
  const assetsWithValue = assets.filter((asset) => asset.fiatValue != null && asset.fiatValue > 0);

  if (assetsWithValue.length === 0 || totalValue <= 0) {
    return null;
  }

  const weighted = assetsWithValue.reduce(
    (sum, asset) => sum + (asset.change24hPercent ?? 0) * (asset.fiatValue ?? 0),
    0,
  );

  return weighted / totalValue;
}

export function getSolanaRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
}

export async function loadPortfolioSummary(
  profile: Pick<WalletProfileRecord, "chainFamily" | "publicAddress" | "type" | "id">,
  chainId: number,
  userId: string,
  currency: FiatCurrency,
): Promise<PortfolioSummaryView> {
  const now = new Date().toISOString();

  if (profile.type === "practice") {
    return loadPracticePortfolioSummary(chainId, currency, now);
  }

  if (profile.chainFamily === "solana") {
    return loadSolanaPortfolioSummary(profile, chainId, userId, currency, now);
  }

  return loadEvmPortfolioSummary(profile, chainId, userId, currency, now);
}

export async function loadEvmPortfolioSummary(
  profile: Pick<WalletProfileRecord, "publicAddress" | "type" | "id">,
  chainId: number,
  userId: string,
  currency: FiatCurrency,
  now = new Date().toISOString(),
): Promise<PortfolioSummaryView> {
  const address = profile.publicAddress as `0x${string}`;
  let userTokens: UserToken[] = [];

  try {
    userTokens = await listUserTokens({ userId, walletProfileId: profile.id });
  } catch {
    userTokens = [];
  }

  const visibleTokens = buildVisibleTokens(chainId, userTokens);

  const [nativeRaw, tokenBalances] = await Promise.all([
    getNativeBalance(address, chainId).catch(() => 0n),
    Promise.all(
      visibleTokens.map(async (token) => {
        const raw = await getErc20Balance(
          token.tokenAddress as `0x${string}`,
          address,
          chainId,
        ).catch(() => 0n);

        return {
          ...token,
          balanceFormatted: formatUnits(raw, token.decimals),
        };
      }),
    ),
  ]);

  const nativeBigInt = typeof nativeRaw === "bigint" ? nativeRaw : BigInt(nativeRaw);
  const nativeFormatted = formatUnits(nativeBigInt, 18);

  const chain = getChainById(chainId);
  const nativeSymbol = chain?.nativeSymbol ?? "ETH";
  const chainName = chain?.name ?? `Chain ${chainId}`;

  const requestSymbols = [nativeSymbol, ...visibleTokens.map((token) => token.symbol)];
  const requestAddresses: Array<string | null> = [null, ...visibleTokens.map((token) => token.tokenAddress)];

  let prices: MarketPrice[] = [];
  try {
    prices = await getMarketPrices({
      chainId,
      currency,
      symbols: requestSymbols,
      tokenAddresses: requestAddresses,
    });
  } catch {
    prices = [];
  }

  const priceMap = new Map(
    prices.map((price) => [marketKey(chainId, price.symbol, price.tokenAddress), price]),
  );

  const nativePrice = resolvePrice(priceMap, chainId, nativeSymbol, null);
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
    isCustom: false,
    provider: nativePrice?.provider ?? null,
    sourceStatus: nativePrice?.sourceStatus ?? null,
    liquidityUsd: nativePrice?.liquidityUsd ?? null,
    pairUrl: nativePrice?.pairUrl ?? null,
    riskLevel: nativePrice?.riskLevel ?? null,
    riskFlags: parseRiskFlags(nativePrice),
    riskFlagsJson: nativePrice?.riskFlagsJson ?? null,
  };

  const tokenAssets: PortfolioAssetView[] = tokenBalances.map((token) => {
    const price = resolvePrice(priceMap, chainId, token.symbol, token.tokenAddress);

    return {
      chainId,
      type: "erc20",
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
      isCustom: token.isCustom,
      provider: price?.provider ?? null,
      sourceStatus: price?.sourceStatus ?? null,
      liquidityUsd: price?.liquidityUsd ?? null,
      pairUrl: price?.pairUrl ?? null,
      riskLevel: price?.riskLevel ?? null,
      riskFlags: parseRiskFlags(price),
      riskFlagsJson: price?.riskFlagsJson ?? null,
    };
  });

  const assets = [nativeAsset, ...tokenAssets];
  const totalValue = assets.reduce((sum, asset) => sum + (asset.fiatValue ?? 0), 0);

  return {
    currency,
    totalValue,
    change24hPercent: calculateWeightedChange(assets, totalValue),
    assets,
    updatedAt: now,
  };
}

export async function loadSolanaPortfolioSummary(
  profile: Pick<WalletProfileRecord, "publicAddress" | "id">,
  chainId: number,
  userId: string,
  currency: FiatCurrency,
  now = new Date().toISOString(),
): Promise<PortfolioSummaryView> {
  let userTokens: UserToken[] = [];

  try {
    userTokens = await listUserTokens({ userId, walletProfileId: profile.id });
  } catch {
    userTokens = [];
  }

  const visibleTokens = buildVisibleTokens(chainId, userTokens);
  const baseDate = new Date(0).toISOString();

  const balances = await getSolanaPortfolioBalances({
    address: profile.publicAddress,
    rpcUrl: getSolanaRpcUrl(),
    tokens: visibleTokens.map((token) => ({
      id: tokenKey(chainId, token.tokenAddress),
      chainId,
      tokenAddress: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoUrl: token.logoUrl ?? null,
      isVerified: token.isVerified,
      createdAt: baseDate,
      updatedAt: baseDate,
    })),
  });

  let prices: MarketPrice[] = [];
  try {
    prices = await getMarketPrices({
      chainId,
      currency,
      symbols: balances.map((asset) => asset.symbol),
      tokenAddresses: balances.map((asset) => asset.tokenAddress ?? ""),
    });
  } catch {
    prices = [];
  }

  const priceMap = new Map(
    prices.map((price) => [marketKey(chainId, price.symbol, price.tokenAddress), price]),
  );

  const assets: PortfolioAssetView[] = balances.map((asset) => {
    const price = resolvePrice(priceMap, chainId, asset.symbol, asset.tokenAddress);
    const fiatValue = price
      ? calcFiatValue(asset.balanceFormatted, price.price)
      : null;

    return {
      chainId: asset.chainId,
      type: asset.type === "native" ? "native" : "erc20",
      tokenAddress: asset.tokenAddress ?? null,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      balanceFormatted: asset.balanceFormatted,
      fiatValue,
      change24hPercent: price?.change24h?.percent ?? null,
      logoUrl: asset.logoUrl ?? null,
      isVerified: asset.isVerified,
      isHidden: false,
      isCustom: false,
      provider: price?.provider ?? null,
      sourceStatus: price?.sourceStatus ?? null,
      liquidityUsd: price?.liquidityUsd ?? null,
      pairUrl: price?.pairUrl ?? null,
      riskLevel: price?.riskLevel ?? null,
      riskFlags: parseRiskFlags(price),
      riskFlagsJson: price?.riskFlagsJson ?? null,
    };
  });

  const totalValue = assets.reduce((sum, asset) => sum + (asset.fiatValue ?? 0), 0);

  return {
    currency,
    totalValue,
    change24hPercent: calculateWeightedChange(assets, totalValue),
    assets,
    updatedAt: now,
  };
}

function loadPracticePortfolioSummary(
  chainId: number,
  currency: FiatCurrency,
  now: string,
): PortfolioSummaryView {
  const chain = getChainById(chainId);
  const nativeSymbol = chain?.nativeSymbol ?? "ETH";
  const nativeDecimals = chain?.family === "solana" ? 9 : 18;

  const nativeBalance = getPracticeNativeBalance(chainId);
  const practiceTokens = getPracticeTokens(chainId);

  const assets: PortfolioAssetView[] = [
    {
      chainId,
      type: "practice",
      symbol: nativeSymbol,
      name: `Practice ${chain?.name ?? "Chain"}`,
      decimals: nativeDecimals,
      balanceFormatted: nativeBalance,
      fiatValue: null,
      change24hPercent: null,
      logoUrl: null,
      isVerified: true,
      isHidden: false,
      isCustom: false,
      riskFlags: [],
    },
    ...practiceTokens.map((token) => ({
      chainId,
      type: "practice" as const,
      tokenAddress: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balanceFormatted: token.balance,
      fiatValue: null,
      change24hPercent: null,
      logoUrl: null,
      isVerified: true,
      isHidden: false,
      isCustom: false,
      riskFlags: [],
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
