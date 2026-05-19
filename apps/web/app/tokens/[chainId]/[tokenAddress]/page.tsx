"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SwapComposer } from "@/components/swap-composer";
import { TokenChart } from "@/components/token-chart";
import {
  getMarketChart,
  getMarketPrices,
  listUserTokens,
  type ChartRange,
  type FiatCurrency,
  type MarketChart,
  type MarketPrice,
} from "@/lib/api";
import { getChainFamilyLabel, isSkeletonFamily } from "@/lib/universal-assets";
import { getUniversalTokenExplorerUrl } from "@/lib/universal-explorer";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import {
  EVM_CHAINS,
  getChainById,
  getCuratedTokens,
  getUniversalChain,
  normalizeAddressForChain,
  type ChainFamily,
  type ChainId,
} from "@acorus/shared";

const RANGES: Array<{ value: ChartRange; label: string }> = [
  { value: "1H", label: "1h" },
  { value: "1D", label: "1d" },
  { value: "1W", label: "1w" },
  { value: "1M", label: "Month" },
  { value: "1Y", label: "Year" },
  { value: "ALL", label: "All time" },
];

interface PageParams {
  chainId: string;
  tokenAddress: string;
}

type TokenMeta = {
  symbol: string;
  name: string;
};

function formatUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value > 0.001) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(2)}`;
}

function badgeForStatus(status?: string | null): { label: string; className: string } | null {
  if (!status) {
    return null;
  }

  const badges: Record<string, { label: string; className: string }> = {
    live: { label: "Live", className: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300" },
    cached: { label: "Cached", className: "border-sky-500/30 bg-sky-500/20 text-sky-300" },
    stale_cache: { label: "Stale", className: "border-amber-500/30 bg-amber-500/20 text-amber-300" },
    fallback_mock: { label: "Fallback", className: "border-slate-600 bg-slate-700/60 text-slate-300" },
  };

  return badges[status] ?? {
    label: status,
    className: "border-slate-600 bg-slate-700/60 text-slate-300",
  };
}

function parseRiskFlags(price: MarketPrice | null): string[] {
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

function findCuratedToken(chainId: number, tokenAddress: string): TokenMeta | null {
  const curated = getCuratedTokens(chainId).find(
    (token) =>
      normalizeAddressForChain(chainId, token.address) === normalizeAddressForChain(chainId, tokenAddress),
  );

  return curated
    ? {
        symbol: curated.symbol,
        name: curated.name,
      }
    : null;
}

function isNativeRouteAddress(tokenAddress: string): boolean {
  return tokenAddress.trim().toLowerCase() === "native";
}

function resolveFamily(
  familyParam: string | null,
  chainId: ChainId,
): ChainFamily {
  if (familyParam) {
    return familyParam as ChainFamily;
  }

  return getUniversalChain({ chainId })?.family
    ?? (typeof chainId === "number" ? getChainById(chainId)?.family : undefined)
    ?? "evm";
}

export default function TokenDetailPage({ params }: { params: Promise<PageParams> | PageParams }) {
  const resolvedParams = "then" in params ? use(params as Promise<PageParams>) : params;
  const rawChainId = decodeURIComponent(resolvedParams.chainId);
  const numericChainId = Number(rawChainId);
  const hasNumericChain = Number.isFinite(numericChainId) && numericChainId > 0;
  const chainId: ChainId = hasNumericChain ? numericChainId : rawChainId;
  const tokenAddress = decodeURIComponent(resolvedParams.tokenAddress);
  const searchParams = useSearchParams();
  const family = resolveFamily(searchParams?.get("family"), chainId);
  const symbolParam = searchParams?.get("symbol") ?? undefined;
  const nameParam = searchParams?.get("name") ?? undefined;
  const isNativeToken = isNativeRouteAddress(tokenAddress);
  const isSkeleton = isSkeletonFamily(family) || !hasNumericChain;
  const familyLabel = getChainFamilyLabel(family);
  const chain = hasNumericChain ? getChainById(numericChainId) ?? getUniversalChain({ family, chainId }) : getUniversalChain({ family, chainId });

  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const currency: FiatCurrency = (activeProfile?.preferredCurrency as FiatCurrency) ?? "USD";

  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(() =>
    hasNumericChain && !isNativeToken && !isSkeleton ? findCuratedToken(numericChainId, tokenAddress) : null,
  );
  const [price, setPrice] = useState<MarketPrice | null>(null);
  const [chart, setChart] = useState<MarketChart | null>(null);
  const [range, setRange] = useState<ChartRange>("1D");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explorerTokenUrl = useMemo(
    () =>
      isNativeToken
        ? null
        : getUniversalTokenExplorerUrl({ family, chainId, tokenAddress }),
    [family, chainId, tokenAddress, isNativeToken],
  );

  useEffect(() => {
    let active = true;

    async function hydrateTokenMeta() {
      if (isNativeToken) {
        const nativeSym = chain?.nativeSymbol ?? symbolParam ?? "TOKEN";
        if (active) setTokenMeta({ symbol: nativeSym, name: nameParam ?? chain?.name ?? nativeSym });
        return;
      }

      if (isSkeleton || !hasNumericChain) {
        if (active) setTokenMeta({ symbol: symbolParam ?? "TOKEN", name: nameParam ?? symbolParam ?? "Token" });
        return;
      }

      const curated = findCuratedToken(numericChainId, tokenAddress);
      if (active && curated) {
        setTokenMeta(curated);
      }

      if (!userId) {
        if (active && !curated) setTokenMeta({ symbol: symbolParam ?? "TOKEN", name: nameParam ?? symbolParam ?? "Token" });
        return;
      }

      try {
        const userTokens = await listUserTokens({
          userId,
          walletProfileId: activeProfile?.id,
        });
        const match = userTokens.find(
          (token) =>
            token.chainId === numericChainId &&
            normalizeAddressForChain(numericChainId, token.tokenAddress) === normalizeAddressForChain(numericChainId, tokenAddress),
        );

        if (active && match) {
          setTokenMeta({ symbol: match.symbol, name: match.name });
        }
      } catch {
        if (active && !curated) setTokenMeta({ symbol: symbolParam ?? "TOKEN", name: nameParam ?? symbolParam ?? "Token" });
      }
    }

    void hydrateTokenMeta();
    return () => {
      active = false;
    };
  }, [activeProfile?.id, chain, hasNumericChain, isNativeToken, isSkeleton, nameParam, numericChainId, symbolParam, tokenAddress, userId]);

  const resolvedSymbol = tokenMeta?.symbol ?? symbolParam ?? "TOKEN";
  const resolvedName = tokenMeta?.name ?? nameParam ?? price?.symbol ?? "Token";

  useEffect(() => {
    let active = true;

    async function loadPrice() {
      if (isSkeleton || !hasNumericChain) return;
      setLoadingPrice(true);
      setError(null);

      try {
        const prices = await getMarketPrices({
          chainId: numericChainId,
          currency,
          symbols: [resolvedSymbol],
          tokenAddresses: [isNativeToken ? null : tokenAddress],
        });

        if (active) {
          setPrice(prices[0] ?? null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load price.");
        }
      } finally {
        if (active) {
          setLoadingPrice(false);
        }
      }
    }

    void loadPrice();
    return () => {
      active = false;
    };
  }, [currency, hasNumericChain, isNativeToken, isSkeleton, numericChainId, resolvedSymbol, tokenAddress]);

  useEffect(() => {
    let active = true;

    async function loadChart() {
      if (isSkeleton || !hasNumericChain) return;
      setLoadingChart(true);

      try {
        const data = await getMarketChart({
          chainId: numericChainId,
          currency,
          symbol: resolvedSymbol,
          tokenAddress: isNativeToken ? null : tokenAddress,
          range,
        });

        if (active) {
          setChart(data);
        }
      } catch {
        if (active) {
          setChart(null);
        }
      } finally {
        if (active) {
          setLoadingChart(false);
        }
      }
    }

    void loadChart();
    return () => {
      active = false;
    };
  }, [currency, hasNumericChain, isNativeToken, isSkeleton, numericChainId, range, resolvedSymbol, tokenAddress]);

  const riskFlags = parseRiskFlags(price);
  const riskLevel = price?.riskLevel;
  const isHighRisk = riskLevel === "high" || riskLevel === "medium";
  const priceBadge = badgeForStatus(price?.sourceStatus);
  const chartBadge = badgeForStatus(chart?.sourceStatus);
  const priceChange = price?.change24h?.percent ?? null;
  const canEvmSwap = family === "evm" && hasNumericChain && EVM_CHAINS.some((item) => item.chainId === numericChainId);
  const activeEvmAddress = activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;
  const targetSwapToken = isNativeToken ? "native" : tokenAddress;
  const defaultSellToken = isNativeToken
    ? getCuratedTokens(numericChainId).find((token) => token.symbol === "USDC")?.address ?? "native"
    : "native";

  return (
    <section className="page mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/explore" className="text-sm text-slate-400 hover:text-white">Explore</Link>
        <span className="text-slate-600">/</span>
        <Link href="/swap" className="text-sm text-slate-400 hover:text-white">Swap</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="app-surface subtle-grid overflow-hidden rounded-[2rem] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <div className="token-orb h-14 w-14 shrink-0 text-base font-bold">
                  {resolvedSymbol.slice(0, 4)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      {resolvedName}
                    </h1>
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">
                      {resolvedSymbol}
                    </span>
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-1 text-xs font-semibold text-violet-200">
                      {familyLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {chain?.name ?? `Chain ${String(chainId)}`}
                  </p>
                  {!isNativeToken ? (
                    <p className="mt-2 break-all text-xs text-slate-500">{tokenAddress}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {explorerTokenUrl ? (
                      <a href={explorerTokenUrl} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm">
                        Explorer
                      </a>
                    ) : null}
                    {price?.pairUrl ? (
                      <a href={price.pairUrl} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm">
                        Pair data
                      </a>
                    ) : null}
                    <Link href="/receive" className="button-secondary text-sm">
                      Receive
                    </Link>
                  </div>
                </div>
              </div>
              <div className="min-w-[180px] text-right">
                {priceBadge ? (
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${priceBadge.className}`}>
                    {priceBadge.label}
                  </span>
                ) : null}
                {loadingPrice ? (
                  <div className="ml-auto mt-4 h-12 w-40 animate-pulse rounded bg-slate-700/50" />
                ) : price ? (
                  <>
                    <p className="mt-3 text-4xl font-semibold text-white">
                      {price.price.toLocaleString("en-US", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: price.price < 1 ? 6 : 2,
                      })}
                    </p>
                    {priceChange != null ? (
                      <p className={`mt-1 text-sm ${priceChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {priceChange >= 0 ? "+" : ""}
                        {priceChange.toFixed(2)}% 24h
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">No price data.</p>
                )}
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
            {isSkeleton ? (
              <div className="mt-5 rounded-2xl border border-amber-700/40 bg-amber-900/20 p-3 text-sm text-amber-300">
                {familyLabel} token page is enabled for discovery, but live chart and swap execution are not enabled for this chain yet.
              </div>
            ) : null}
          </div>

          <div className="panel space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Market chart</h2>
                <p className="text-xs text-slate-500">
                  Hover the curve to inspect point-in-time prices.
                </p>
              </div>
              {chartBadge ? (
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${chartBadge.className}`}>
                  {chartBadge.label}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRange(item.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === item.value
                      ? "border-cyan-400/40 bg-cyan-400/20 text-cyan-100"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <TokenChart chart={chart} loading={loadingChart} symbol={resolvedSymbol} currency={currency} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Market cap" value={formatUsd(price?.marketCap)} />
            <MetricCard label="Liquidity" value={formatUsd(price?.liquidityUsd)} />
            <MetricCard label="24h volume" value={formatUsd(price?.volume24h)} />
            <MetricCard label="Price source" value={price?.provider ?? "Unavailable"} />
            <MetricCard label="Chart source" value={chart?.provider ?? "Unavailable"} />
            <MetricCard label="Risk" value={riskLevel ?? "Unknown"} tone={riskLevel} />
          </div>

          {isHighRisk || riskFlags.length > 0 ? (
            <div className="panel space-y-3 border-amber-500/30 bg-amber-500/10">
              <h2 className="text-lg font-semibold text-amber-200">
                Token risk notes
              </h2>
              <p className="text-sm text-slate-300">
                Verify contract address, liquidity and route before trading. Swaps are irreversible once signed.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(riskFlags.length ? riskFlags : ["review_before_trading"]).map((flag) => (
                  <span key={flag} className="rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] text-slate-300">
                    {flag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {canEvmSwap ? (
            <SwapComposer
              compact
              initialChainId={numericChainId}
              initialSellToken={defaultSellToken}
              initialBuyToken={targetSwapToken}
              portfolioAssets={[]}
              userAddress={activeEvmAddress}
              title={`Swap ${resolvedSymbol}`}
              description="Get a backend 0x quote and review the final transaction inside Acorus extension."
            />
          ) : (
            <div className="premium-card space-y-4 p-5">
              <span className="section-kicker">Swap status</span>
              <h2 className="text-2xl font-semibold text-white">
                {resolvedSymbol} swap is coming next
              </h2>
              <p className="text-sm leading-6 text-slate-300">
                This wave executes 0x swaps only on EVM chains. Solana/Jupiter, Tron, Bitcoin, TON and cross-chain routes stay gated until their adapters are reviewed.
              </p>
              <Link href="/swap" className="button-secondary inline-flex">
                Open swap shell
              </Link>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: string | null }) {
  const toneClass =
    tone === "low" ? "text-emerald-300" :
    tone === "medium" ? "text-amber-300" :
    tone === "high" ? "text-rose-300" :
    "text-white";

  return (
    <div className="premium-card p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold capitalize ${toneClass}`}>{value}</p>
    </div>
  );
}
