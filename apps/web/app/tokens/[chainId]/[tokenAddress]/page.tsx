"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import {
  getMarketChart,
  getMarketPrices,
  listUserTokens,
  type ChartRange,
  type FiatCurrency,
  type MarketChart,
  type MarketPrice,
} from "@/lib/api";
import { TokenChart } from "@/components/token-chart";
import { getChainById, getCuratedTokens, normalizeAddressForChain } from "@acorus/shared";

const RANGES: ChartRange[] = ["1D", "7D", "1M", "3M", "1Y"];

interface PageParams {
  chainId: string;
  tokenAddress: string;
}

type TokenMeta = {
  symbol: string;
  name: string;
};

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function badgeForStatus(status?: string | null): { label: string; className: string } | null {
  if (!status) {
    return null;
  }

  const badges: Record<string, { label: string; className: string }> = {
    live: { label: "Live", className: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300" },
    cached: { label: "Cached", className: "border-sky-500/30 bg-sky-500/20 text-sky-300" },
    stale_cache: { label: "Stale", className: "border-amber-500/30 bg-amber-500/20 text-amber-300" },
    fallback_mock: { label: "Mock", className: "border-slate-600 bg-slate-700/60 text-slate-300" },
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

export default function TokenDetailPage({ params }: { params: Promise<PageParams> | PageParams }) {
  const resolvedParams = "then" in params ? use(params as Promise<PageParams>) : params;
  const chainId = Number(resolvedParams.chainId);
  const tokenAddress = resolvedParams.tokenAddress;

  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const currency: FiatCurrency = (activeProfile?.preferredCurrency as FiatCurrency) ?? "USD";

  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(() => findCuratedToken(chainId, tokenAddress));
  const [price, setPrice] = useState<MarketPrice | null>(null);
  const [chart, setChart] = useState<MarketChart | null>(null);
  const [range, setRange] = useState<ChartRange>("7D");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chain = useMemo(
    () => getChainById(chainId),
    [chainId],
  );

  useEffect(() => {
    let active = true;

    async function hydrateTokenMeta() {
      const curated = findCuratedToken(chainId, tokenAddress);
      if (active && curated) {
        setTokenMeta(curated);
      }

      if (!userId) {
        return;
      }

      try {
        const userTokens = await listUserTokens({
          userId,
          walletProfileId: activeProfile?.id,
        });
        const match = userTokens.find(
          (token) =>
            token.chainId === chainId &&
            normalizeAddressForChain(chainId, token.tokenAddress) === normalizeAddressForChain(chainId, tokenAddress),
        );

        if (active && match) {
          setTokenMeta({
            symbol: match.symbol,
            name: match.name,
          });
        }
      } catch {
        // non-fatal
      }
    }

    void hydrateTokenMeta();
    return () => {
      active = false;
    };
  }, [activeProfile?.id, chainId, tokenAddress, userId]);

  const resolvedSymbol = tokenMeta?.symbol ?? "TOKEN";
  const resolvedName = tokenMeta?.name ?? price?.symbol ?? "Token";

  useEffect(() => {
    let active = true;

    async function loadPrice() {
      setLoadingPrice(true);
      setError(null);

      try {
        const prices = await getMarketPrices({
          chainId,
          currency,
          symbols: [resolvedSymbol],
          tokenAddresses: [tokenAddress],
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
  }, [chainId, currency, resolvedSymbol, tokenAddress]);

  useEffect(() => {
    let active = true;

    async function loadChart() {
      setLoadingChart(true);

      try {
        const data = await getMarketChart({
          chainId,
          currency,
          symbol: resolvedSymbol,
          tokenAddress,
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
  }, [chainId, currency, range, resolvedSymbol, tokenAddress]);

  const riskFlags = parseRiskFlags(price);
  const riskLevel = price?.riskLevel;
  const isHighRisk = riskLevel === "high" || riskLevel === "medium";
  const priceBadge = badgeForStatus(price?.sourceStatus);
  const chartBadge = badgeForStatus(chart?.sourceStatus);

  return (
    <section className="page mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-sm text-slate-400 hover:text-white">← Wallet</Link>
        <span className="text-slate-600">/</span>
        <Link href="/tokens/manage" className="text-sm text-slate-400 hover:text-white">Manage tokens</Link>
      </div>

      <div className="panel space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">{chain?.name ?? `Chain ${chainId}`}</p>
            <h1 className="mt-1 text-2xl font-semibold">{resolvedName}</h1>
            <p className="mt-1 text-sm text-slate-300">{resolvedSymbol}</p>
            <p className="mt-2 break-all text-xs text-slate-500">{tokenAddress}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {priceBadge ? (
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${priceBadge.className}`}>
                {priceBadge.label}
              </span>
            ) : null}
            {price?.provider ? (
              <span className="text-[10px] text-slate-500">price via {price.provider}</span>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {isHighRisk ? (
          <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 p-3 space-y-1">
            <p className="text-sm font-medium text-amber-300">
              ⚠ {riskLevel === "high" ? "High" : "Medium"} risk token
            </p>
            <p className="text-xs text-slate-300">
              Verify the contract and liquidity independently before sending or trading.
            </p>
          </div>
        ) : null}

        {loadingPrice ? (
          <div className="h-12 w-40 animate-pulse rounded bg-slate-700/50" />
        ) : price ? (
          <div>
            <p className="text-4xl font-semibold">
              {price.price.toLocaleString("en-US", {
                style: "currency",
                currency,
                maximumFractionDigits: price.price < 1 ? 6 : 2,
              })}
            </p>
            {price.change24h ? (
              <p className={`mt-1 text-sm ${price.change24h.percent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {price.change24h.percent >= 0 ? "+" : ""}
                {price.change24h.percent.toFixed(2)}% (24h)
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No price data available.</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
            <p className="mb-0.5 text-xs text-slate-400">Price source</p>
            <p className="font-medium">{price?.provider ?? "Unavailable"}</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
            <p className="mb-0.5 text-xs text-slate-400">Chart source</p>
            <p className="font-medium">{chart?.provider ?? "Unavailable"}</p>
            {chartBadge ? <p className="text-[11px] text-slate-500">{chartBadge.label}</p> : null}
          </div>
          {price?.liquidityUsd != null ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
              <p className="mb-0.5 text-xs text-slate-400">Liquidity</p>
              <p className="font-medium">{formatUsd(price.liquidityUsd)}</p>
            </div>
          ) : null}
          {price?.volume24h != null ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
              <p className="mb-0.5 text-xs text-slate-400">24h volume</p>
              <p className="font-medium">{formatUsd(price.volume24h)}</p>
            </div>
          ) : null}
          {price?.marketCap != null ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
              <p className="mb-0.5 text-xs text-slate-400">Market cap</p>
              <p className="font-medium">{formatUsd(price.marketCap)}</p>
            </div>
          ) : null}
          {riskLevel ? (
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
              <p className="mb-0.5 text-xs text-slate-400">Risk</p>
              <p className={`font-medium capitalize ${
                riskLevel === "low" ? "text-emerald-400" :
                riskLevel === "medium" ? "text-amber-400" :
                riskLevel === "high" ? "text-rose-400" :
                "text-slate-400"
              }`}>
                {riskLevel}
              </p>
            </div>
          ) : null}
        </div>

        {riskFlags.length > 0 ? (
          <div>
            <p className="mb-2 text-xs text-slate-400">Risk flags</p>
            <div className="flex flex-wrap gap-1.5">
              {riskFlags.map((flag) => (
                <span key={flag} className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300">
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {price?.pairUrl ? (
          <a
            href={price.pairUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            View pair ↗
          </a>
        ) : null}

        <div className="flex gap-2">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                range === item
                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <TokenChart chart={chart} loading={loadingChart} symbol={resolvedSymbol} />
        </div>

        <div className="flex gap-3">
          <Link
            href={`/send?token=${encodeURIComponent(tokenAddress)}&chainId=${chainId}`}
            className="button-primary flex-1 text-center"
          >
            Send
          </Link>
          <Link href="/receive" className="button-secondary flex-1 text-center">
            Receive
          </Link>
        </div>
      </div>
    </section>
  );
}
