"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useActiveProfile } from "@/store/wallet-store";
import { getMarketChart, getMarketPrices, type FiatCurrency, type MarketChart, type MarketPrice } from "@/lib/api";
import { TokenChart } from "@/components/token-chart";
import { EVM_CHAINS } from "@acorus/shared";

type Range = "1D" | "7D" | "1M" | "3M" | "1Y";
const RANGES: Range[] = ["1D", "7D", "1M", "3M", "1Y"];

interface PageParams {
  chainId: string;
  tokenAddress: string;
}

function formatUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function SourceStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    live:          { label: "Live",        cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    cached:        { label: "Cached",      cls: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
    stale_cache:   { label: "Stale",       cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    fallback_mock: { label: "Mock",        cls: "bg-slate-700/60 text-slate-400 border-slate-600" },
  };
  const entry = map[status] ?? { label: status, cls: "bg-slate-700/60 text-slate-400 border-slate-600" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

export default function TokenDetailPage({ params }: { params: Promise<PageParams> | PageParams }) {
  const resolvedParams = "then" in params ? use(params as Promise<PageParams>) : params;
  const chainId = Number(resolvedParams.chainId);
  const tokenAddress = resolvedParams.tokenAddress;

  const activeProfile = useActiveProfile();
  const currency: FiatCurrency = (activeProfile?.preferredCurrency as FiatCurrency) ?? "USD";

  const [price, setPrice] = useState<MarketPrice | null>(null);
  const [chart, setChart] = useState<MarketChart | null>(null);
  const [range, setRange] = useState<Range>("7D");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chain = EVM_CHAINS.find((c) => c.chainId === chainId);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoadingPrice(true);
      setError(null);
      try {
        const symbol = "TOKEN";
        const prices = await getMarketPrices({
          chainId,
          currency,
          symbols: [symbol],
          tokenAddresses: [tokenAddress],
        });
        if (active && prices.length) setPrice(prices[0] ?? null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load price.");
      } finally {
        if (active) setLoadingPrice(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [chainId, tokenAddress, currency]);

  useEffect(() => {
    let active = true;

    async function loadChart() {
      setLoadingChart(true);
      try {
        const symbol = price?.symbol ?? "TOKEN";
        const data = await getMarketChart({
          chainId,
          currency,
          symbol,
          tokenAddress,
          range,
        });
        if (active) setChart(data);
      } catch {
        // non-fatal
      } finally {
        if (active) setLoadingChart(false);
      }
    }

    void loadChart();
    return () => { active = false; };
  }, [chainId, tokenAddress, currency, range, price?.symbol]);

  const riskFlags: string[] = (() => {
    try { return price?.riskFlagsJson ? JSON.parse(price.riskFlagsJson) as string[] : []; }
    catch { return []; }
  })();

  const riskLevel = price?.riskLevel;
  const isHighRisk = riskLevel === "high" || riskLevel === "medium";

  return (
    <section className="page max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-sm text-slate-400 hover:text-white">← Wallet</Link>
        <span className="text-slate-600">/</span>
        <p className="text-sm text-slate-300 truncate">{tokenAddress}</p>
      </div>

      <div className="panel space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">{chain?.name ?? `Chain ${chainId}`}</p>
            <h1 className="text-2xl font-semibold mt-1">
              {price?.symbol ?? "Token"} Details
            </h1>
            <p className="text-xs text-slate-500 mt-1 break-all">{tokenAddress}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <SourceStatusBadge status={price?.sourceStatus} />
            {price?.provider && price.provider !== "mock" && (
              <span className="text-[10px] text-slate-500">via {price.provider}</span>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        {/* Risk warning */}
        {isHighRisk && (
          <div className="rounded-xl border border-amber-700/40 bg-amber-900/20 p-3 space-y-1">
            <p className="text-sm font-medium text-amber-300">
              ⚠️ {riskLevel === "high" ? "High" : "Medium"} Risk Token
            </p>
            <p className="text-xs text-slate-300">
              Please verify this token contract independently before trading.
            </p>
          </div>
        )}

        {loadingPrice ? (
          <div className="animate-pulse h-12 w-40 rounded bg-slate-700/50" />
        ) : price ? (
          <div>
            <p className="text-4xl font-semibold">
              {price.price.toLocaleString("en-US", {
                style: "currency",
                currency,
                maximumFractionDigits: price.price < 1 ? 6 : 2,
              })}
            </p>
            {price.change24h && (
              <p className={`text-sm mt-1 ${price.change24h.percent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {price.change24h.percent >= 0 ? "+" : ""}{price.change24h.percent.toFixed(2)}% (24h)
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No price data available.</p>
        )}

        {/* Market stats grid */}
        {price && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {price.liquidityUsd != null && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">Liquidity</p>
                <p className="font-medium">{formatUsd(price.liquidityUsd)}</p>
              </div>
            )}
            {price.volume24h != null && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">24h Volume</p>
                <p className="font-medium">{formatUsd(price.volume24h)}</p>
              </div>
            )}
            {price.marketCap != null && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">Market Cap</p>
                <p className="font-medium">{formatUsd(price.marketCap)}</p>
              </div>
            )}
            {riskLevel && riskLevel !== "unknown" && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">Risk</p>
                <p className={`font-medium capitalize ${
                  riskLevel === "low" ? "text-emerald-400" :
                  riskLevel === "medium" ? "text-amber-400" :
                  riskLevel === "high" ? "text-rose-400" : "text-slate-400"
                }`}>{riskLevel}</p>
              </div>
            )}
          </div>
        )}

        {/* Risk flags */}
        {riskFlags.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Risk flags</p>
            <div className="flex flex-wrap gap-1.5">
              {riskFlags.map((flag) => (
                <span key={flag} className="px-2 py-0.5 text-[10px] rounded-full bg-slate-700/80 text-slate-300">
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pair link */}
        {price?.pairUrl && (
          <a
            href={price.pairUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            View pair ↗
          </a>
        )}

        {/* Chart ranges */}
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                range === r
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <TokenChart chart={chart} loading={loadingChart} symbol={price?.symbol ?? "TOKEN"} />
        </div>

        {/* Actions */}
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
