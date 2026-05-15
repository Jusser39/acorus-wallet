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

function ChangeLabel({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const color = pct >= 0 ? "text-emerald-400" : "text-rose-400";
  const sign = pct >= 0 ? "+" : "";
  return <span className={`text-xs ${color}`}>{sign}{pct.toFixed(2)}%</span>;
}

export function AssetList({ assets, hidden, currency, chainId, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 animate-pulse">
            <div className="h-5 w-24 rounded bg-slate-700/50" />
          </div>
        ))}
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
        No assets found for this chain.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => {
        const key = asset.tokenAddress ?? `native-${asset.symbol}`;
        const detailHref =
          asset.type === "erc20" && asset.tokenAddress
            ? `/tokens/${chainId}/${asset.tokenAddress}`
            : null;

        const inner = (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {asset.symbol.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{asset.symbol}</p>
                <p className="text-xs text-slate-400 truncate">{asset.name}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold">
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
          <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors">
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
