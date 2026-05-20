"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SwapComposer } from "@/components/swap-composer";
import { TokenChart } from "@/components/token-chart";
import {
  getMarketChart,
  getMarketCoinChart,
  getMarketPrices,
  getMarketTokenDetail,
  listUserTokens,
  type ChartRange,
  type FiatCurrency,
  type MarketChart,
  type MarketPrice,
  type TokenDetail,
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
  const isCoinGeckoRoute = rawChainId.toLowerCase() === "coingecko";
  const numericChainId = Number(rawChainId);
  const hasNumericChain = Number.isFinite(numericChainId) && numericChainId > 0;
  const chainId: ChainId = hasNumericChain ? numericChainId : rawChainId;
  const tokenAddress = decodeURIComponent(resolvedParams.tokenAddress);
  const coinId = isCoinGeckoRoute ? tokenAddress : null;
  const searchParams = useSearchParams();
  const family = resolveFamily(searchParams?.get("family"), chainId);
  const symbolParam = searchParams?.get("symbol") ?? undefined;
  const nameParam = searchParams?.get("name") ?? undefined;
  const isNativeToken = isNativeRouteAddress(tokenAddress);
  const isSkeleton = isSkeletonFamily(family) || (!hasNumericChain && !isCoinGeckoRoute);
  const familyLabel = getChainFamilyLabel(family);
  const chain = hasNumericChain ? getChainById(numericChainId) ?? getUniversalChain({ family, chainId }) : getUniversalChain({ family, chainId });

  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const currency: FiatCurrency = (activeProfile?.preferredCurrency as FiatCurrency) ?? "USD";

  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(() =>
    hasNumericChain && !isNativeToken && !isSkeleton ? findCuratedToken(numericChainId, tokenAddress) : null,
  );
  const [tokenDetail, setTokenDetail] = useState<TokenDetail | null>(null);
  const [price, setPrice] = useState<MarketPrice | null>(null);
  const [chart, setChart] = useState<MarketChart | null>(null);
  const [range, setRange] = useState<ChartRange>("1D");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">("idle");
  const [explorerMenuOpen, setExplorerMenuOpen] = useState(false);

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

      if (isCoinGeckoRoute) {
        if (active) setTokenMeta({ symbol: symbolParam ?? "TOKEN", name: nameParam ?? symbolParam ?? "Token" });
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
  }, [activeProfile?.id, chain, hasNumericChain, isCoinGeckoRoute, isNativeToken, isSkeleton, nameParam, numericChainId, symbolParam, tokenAddress, userId]);

  const resolvedSymbol = tokenDetail?.symbol ?? tokenMeta?.symbol ?? symbolParam ?? "TOKEN";
  const resolvedName = tokenDetail?.name ?? tokenMeta?.name ?? nameParam ?? price?.symbol ?? "Token";

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      setError(null);
      try {
        const detail = await getMarketTokenDetail({
          coinId: coinId ?? undefined,
          chainId: !isCoinGeckoRoute && hasNumericChain && !isNativeToken ? numericChainId : undefined,
          tokenAddress: !isCoinGeckoRoute && hasNumericChain && !isNativeToken ? tokenAddress : undefined,
          currency,
        });
        if (!active) return;
        setTokenDetail(detail);
        if (detail) {
          setTokenMeta({ symbol: detail.symbol, name: detail.name });
        }
      } catch (err) {
        if (active) {
          setTokenDetail(null);
          if (isCoinGeckoRoute) {
            setError(err instanceof Error ? err.message : "Failed to load token detail.");
          }
        }
      }
    }

    if (isCoinGeckoRoute || (hasNumericChain && !isNativeToken && !isSkeleton)) {
      void loadDetail();
    }

    return () => {
      active = false;
    };
  }, [coinId, currency, hasNumericChain, isCoinGeckoRoute, isNativeToken, isSkeleton, numericChainId, tokenAddress]);

  useEffect(() => {
    let active = true;

    async function loadPrice() {
      if (isSkeleton || !hasNumericChain || isCoinGeckoRoute) return;
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
  }, [currency, hasNumericChain, isCoinGeckoRoute, isNativeToken, isSkeleton, numericChainId, resolvedSymbol, tokenAddress]);

  useEffect(() => {
    let active = true;

    async function loadChart() {
      if (isSkeleton || (!hasNumericChain && !isCoinGeckoRoute)) return;
      setLoadingChart(true);

      try {
        const data = isCoinGeckoRoute && coinId
          ? await getMarketCoinChart({ coinId, currency, range })
          : await getMarketChart({
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
  }, [coinId, currency, hasNumericChain, isCoinGeckoRoute, isNativeToken, isSkeleton, numericChainId, range, resolvedSymbol, tokenAddress]);

  const riskFlags = parseRiskFlags(price);
  const riskLevel = price?.riskLevel;
  const isHighRisk = riskLevel === "high" || riskLevel === "medium";
  const priceBadge = badgeForStatus(tokenDetail?.sourceStatus ?? price?.sourceStatus);
  const chartBadge = badgeForStatus(chart?.sourceStatus);
  const priceChange = tokenDetail?.change24h?.percent ?? price?.change24h?.percent ?? null;
  const tradePlatform = useMemo(
    () => tokenDetail?.platforms.find((platform) =>
      typeof platform.chainId === "number"
      && EVM_CHAINS.some((item) => item.chainId === platform.chainId)
      && platform.tokenAddress,
    ) ?? null,
    [tokenDetail],
  );
  const tradeChainId = isCoinGeckoRoute && tradePlatform
    ? Number(tradePlatform.chainId)
    : numericChainId;
  const tradeTokenAddress = isCoinGeckoRoute && tradePlatform?.tokenAddress
    ? tradePlatform.tokenAddress
    : tokenAddress;
  const canEvmSwap = (isCoinGeckoRoute ? Boolean(tradePlatform) : family === "evm")
    && Number.isFinite(tradeChainId)
    && EVM_CHAINS.some((item) => item.chainId === tradeChainId);
  const activeEvmAddress = activeProfile?.chainFamily === "evm" ? activeProfile.publicAddress : null;
  const targetSwapToken = isNativeToken && !isCoinGeckoRoute ? "native" : tradeTokenAddress;
  const defaultSellToken = isNativeToken && !isCoinGeckoRoute
    ? getCuratedTokens(tradeChainId).find((token) => token.symbol === "USDC")?.address ?? "native"
    : "native";
  const displayPrice = tokenDetail?.price ?? price?.price ?? null;
  const displayMarketCap = tokenDetail?.marketCapUsd ?? price?.marketCap ?? null;
  const displayVolume24h = tokenDetail?.volume24hUsd ?? price?.volume24h ?? null;
  const displayLiquidity = tokenDetail?.liquidityUsd ?? price?.liquidityUsd ?? null;
  const displayFdv = tokenDetail?.fdvUsd ?? null;
  const displayHigh24h = tokenDetail?.high24hUsd ?? null;
  const displayLow24h = tokenDetail?.low24hUsd ?? null;
  const externalLinks = tokenDetail?.links ?? [];
  const logoUrl = tokenDetail?.logoUrl ?? null;
  const explorerOptions = useMemo(() => {
    const entries: Array<{ label: string; url: string }> = [];

    if (explorerTokenUrl) {
      entries.push({ label: chain?.name ?? "Explorer", url: explorerTokenUrl });
    }

    for (const platform of tokenDetail?.platforms ?? []) {
      if (!platform.tokenAddress) continue;
      const platformChain = typeof platform.chainId === "number"
        ? getChainById(platform.chainId) ?? getUniversalChain({ chainId: platform.chainId })
        : getUniversalChain({ chainId: platform.chainId });
      const platformFamily = platformChain?.family
        ?? (typeof platform.chainId === "number" ? "evm" : family);
      const url = getUniversalTokenExplorerUrl({
        family: platformFamily as ChainFamily,
        chainId: platform.chainId,
        tokenAddress: platform.tokenAddress,
      });

      if (url) {
        entries.push({ label: platformChain?.name ?? platform.chainKey, url });
      }
    }

    const seen = new Set<string>();
    return entries.filter((entry) => {
      if (seen.has(entry.url)) return false;
      seen.add(entry.url);
      return true;
    });
  }, [chain?.name, explorerTokenUrl, family, tokenDetail?.platforms]);

  async function handleShare() {
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    setShareState("idle");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${resolvedName} on Acorus Wallet`,
          text: `View ${resolvedSymbol} market data and swap routes on Acorus Wallet.`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1600);
      } catch {
        setShareState("failed");
      }
    }
  }

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
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={resolvedSymbol} className="h-14 w-14 shrink-0 rounded-full bg-slate-800" />
                ) : (
                  <div className="token-orb h-14 w-14 shrink-0 text-base font-bold">
                    {resolvedSymbol.slice(0, 4)}
                  </div>
                )}
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
                    {explorerOptions.length ? (
                      <div className="relative">
                        <button type="button" onClick={() => setExplorerMenuOpen((value) => !value)} className="button-secondary text-sm">
                          Explorers
                        </button>
                        {explorerMenuOpen ? (
                          <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-64 overflow-hidden rounded-2xl border border-fuchsia-100 bg-white p-2 text-slate-950 shadow-[0_22px_60px_rgba(88,28,135,0.18)]">
                            {explorerOptions.map((option) => (
                              <a
                                key={option.url}
                                href={option.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-fuchsia-50"
                              >
                                <span>{option.label}</span>
                                <span className="text-slate-400">↗</span>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {externalLinks.map((link) => (
                      <a key={`${link.kind}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm">
                        {link.label}
                      </a>
                    ))}
                    <button type="button" onClick={() => void handleShare()} className="button-secondary text-sm">
                      {shareState === "copied" ? "Copied" : shareState === "failed" ? "Copy failed" : "Share"}
                    </button>
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
                ) : displayPrice != null ? (
                  <>
                    <p className="mt-3 text-4xl font-semibold text-white">
                      {displayPrice.toLocaleString("en-US", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: displayPrice < 1 ? 6 : 2,
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
            <MetricCard label="Market cap" value={formatUsd(displayMarketCap)} />
            <MetricCard label="FDV" value={formatUsd(displayFdv)} />
            <MetricCard label="24h volume" value={formatUsd(displayVolume24h)} />
            <MetricCard label="Liquidity" value={formatUsd(displayLiquidity)} />
            <MetricCard label="24h high" value={formatUsd(displayHigh24h)} />
            <MetricCard label="24h low" value={formatUsd(displayLow24h)} />
            <MetricCard label="Risk" value={riskLevel ?? "Unknown"} tone={riskLevel} />
          </div>

          {tokenDetail?.description ? (
            <div className="panel space-y-3">
              <h2 className="text-xl font-semibold text-white">About {resolvedName}</h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-300">
                {tokenDetail.description.length > 720
                  ? `${tokenDetail.description.slice(0, 720)}...`
                  : tokenDetail.description}
              </p>
            </div>
          ) : null}

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
              initialChainId={tradeChainId}
              initialSellToken={defaultSellToken}
              initialBuyToken={targetSwapToken}
              initialBuyTokenMeta={{
                symbol: resolvedSymbol,
                name: resolvedName,
                decimals: tradePlatform?.decimals ?? 18,
              }}
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
