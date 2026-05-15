"use client";

import Link from "next/link";
import type { PortfolioAssetView } from "@/lib/portfolio";
import type { FiatCurrency } from "@/lib/api";

interface Props {
  assets: PortfolioAssetView[];
  hidden: boolean;
  currency: FiatCurrency;
  chainId: number;
  loading?: boolean;
}

function formatFiat(value: number, currency: FiatCurrency): string {
  try {
    const locale = currency === "RUB" ? "ru-RU" : currency === "EUR" ? "de-DE" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function formatBalance(bal: string): string {
  const n = parseFloat(bal);
  if (isNaN(n)) return bal;
  if (n === 0) return "0";
  if (n < 0.0001) return "< 0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatLiquidity(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function ChangeLabel({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const color = pct >= 0 ? "text-emerald-400" : "text-rose-400";
  const sign = pct >= 0 ? "+" : "";
  return <span className={`text-xs ${color}`}>{sign}{pct.toFixed(2)}%</span>;
}

function ProviderBadge({ provider, sourceStatus }: { provider?: string | null; sourceStatus?: string | null }) {
  if (!provider || provider === "mock") return null;
  const label = provider === "dexscreener" ? "DEX" : provider === "coingecko" ? "CG" : provider.toUpperCase();
  const statusDot =
    sourceStatus === "live" ? "bg-emerald-400" :
    sourceStatus === "cached" ? "bg-sky-400" :
    sourceStatus === "stale_cache" ? "bg-amber-400" :
    sourceStatus === "fallback_mock" ? "bg-slate-500" : "bg-slate-500";
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-700/80 text-[10px] text-slate-300">
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
      {label}
    </span>
  );
}

function RiskBadge({ riskLevel }: { riskLevel?: string | null }) {
  if (!riskLevel || riskLevel === "unknown") return null;
  const styles: Record<string, string> = {
    low: "bg-emerald-900/40 text-emerald-300",
    medium: "bg-amber-900/40 text-amber-300",
    high: "bg-rose-900/40 text-rose-300",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${styles[riskLevel] ?? "bg-slate-700/80 text-slate-300"}`}>
      {riskLevel.toUpperCase()}
    </span>
  );
}

export function AssetList({ assets, hidden, currency, chainId, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-700/50 bg-white/5 backdrop-blur-sm p-4 animate-pulse">
            <div className="h-5 w-24 rounded bg-slate-700/50" />
          </div>
        ))}
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-white/5 backdrop-blur-sm p-4 text-sm text-slate-400">
        No assets found for this chain.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => {
        const key = asset.tokenAddress ?? `native-${asset.symbol}`;
        const detailHref =
          asset.type === "erc20" && asset.tokenAddress
            ? `/tokens/${chainId}/${asset.tokenAddress}`
            : null;

        const inner = (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-inner">
                {asset.symbol.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm truncate">{asset.symbol}</p>
                  <ProviderBadge provider={asset.provider} sourceStatus={asset.sourceStatus} />
                  <RiskBadge riskLevel={asset.riskLevel} />
                </div>
                <p className="text-xs text-slate-400 truncate">{asset.name}</p>
                {asset.liquidityUsd != null && (
                  <p className="text-[10px] text-slate-500">
                    Liq {formatLiquidity(asset.liquidityUsd)}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm">
                {hidden ? "••••" : formatBalance(asset.balanceFormatted)}
              </p>
              {!hidden && asset.fiatValue != null && (
                <p className="text-xs text-slate-400">
                  {formatFiat(asset.fiatValue, currency)}
                </p>
              )}
              {!hidden && <ChangeLabel pct={asset.change24hPercent} />}
            </div>
          </div>
        );

        return (
          <div
            key={key}
            className="rounded-2xl border border-slate-700/50 bg-white/5 backdrop-blur-sm p-4 hover:border-slate-600 hover:bg-white/8 transition-all duration-150"
          >
            {detailHref ? (
              <Link href={detailHref} className="block">{inner}</Link>
            ) : (
              inner
            )}
          </div>
        );
      })}
    </div>
  );
}
