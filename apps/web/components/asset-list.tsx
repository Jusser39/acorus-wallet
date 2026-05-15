"use client";

import { normalizeAddressForChain } from "@acorus/shared";
import Link from "next/link";
import type { PortfolioAssetView } from "@/lib/portfolio";
import type { FiatCurrency } from "@/lib/api";

interface Props {
  assets: PortfolioAssetView[];
  hidden: boolean;
  currency: FiatCurrency;
  chainId: number;
  loading?: boolean;
  onHideToken?: (asset: PortfolioAssetView) => void;
  busyTokenKey?: string | null;
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

function formatBalance(balance: string): string {
  const parsed = parseFloat(balance);
  if (Number.isNaN(parsed)) {
    return balance;
  }
  if (parsed === 0) {
    return "0";
  }
  if (parsed < 0.0001) {
    return "< 0.0001";
  }
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function formatLiquidity(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function ChangeLabel({ pct }: { pct: number | null }) {
  if (pct == null) {
    return null;
  }

  const color = pct >= 0 ? "text-emerald-400" : "text-rose-400";
  const sign = pct >= 0 ? "+" : "";
  return <span className={`text-xs ${color}`}>{sign}{pct.toFixed(2)}%</span>;
}

function ProviderBadge({ provider, sourceStatus }: { provider?: string | null; sourceStatus?: string | null }) {
  if (!provider || provider === "mock") {
    return null;
  }

  const label = provider === "dexscreener" ? "DEX" : provider === "coingecko" ? "CG" : provider.toUpperCase();
  const statusDot =
    sourceStatus === "live" ? "bg-emerald-400" :
    sourceStatus === "cached" ? "bg-sky-400" :
    sourceStatus === "stale_cache" ? "bg-amber-400" :
    "bg-slate-500";

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-300">
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
      {label}
    </span>
  );
}

function RiskBadge({ riskLevel }: { riskLevel?: string | null }) {
  if (!riskLevel || riskLevel === "unknown") {
    return null;
  }

  const styles: Record<string, string> = {
    low: "bg-emerald-900/40 text-emerald-300",
    medium: "bg-amber-900/40 text-amber-300",
    high: "bg-rose-900/40 text-rose-300",
  };

  return (
    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles[riskLevel] ?? "bg-slate-700/80 text-slate-300"}`}>
      {riskLevel.toUpperCase()}
    </span>
  );
}

function tokenActionKey(asset: PortfolioAssetView): string {
  return asset.tokenAddress
    ? `${asset.chainId}:${normalizeAddressForChain(asset.chainId, asset.tokenAddress)}`
    : `native:${asset.chainId}:${asset.symbol.toUpperCase()}`;
}

export function AssetList({
  assets,
  hidden,
  currency,
  chainId,
  loading,
  onHideToken,
  busyTokenKey,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-slate-700/50 bg-white/5 p-4 backdrop-blur-sm">
            <div className="h-5 w-24 rounded bg-slate-700/50" />
          </div>
        ))}
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-white/5 p-4 text-sm text-slate-400 backdrop-blur-sm">
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
        const isBusy = busyTokenKey === tokenActionKey(asset);

        return (
          <div
            key={key}
            className="rounded-2xl border border-slate-700/50 bg-white/5 p-4 transition-all duration-150 hover:border-slate-600 hover:bg-white/8"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {detailHref ? (
                  <Link href={detailHref} className="block">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-600 text-xs font-bold text-white shadow-inner">
                        {asset.symbol.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{asset.symbol}</p>
                          <ProviderBadge provider={asset.provider} sourceStatus={asset.sourceStatus} />
                          <RiskBadge riskLevel={asset.riskLevel} />
                          {asset.isCustom ? (
                            <span className="inline-flex rounded-full bg-slate-700/80 px-1.5 py-0.5 text-[10px] text-slate-300">
                              Custom
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-slate-400">{asset.name}</p>
                        {asset.liquidityUsd != null ? (
                          <p className="text-[10px] text-slate-500">Liq {formatLiquidity(asset.liquidityUsd)}</p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-600 text-xs font-bold text-white shadow-inner">
                      {asset.symbol.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{asset.symbol}</p>
                        <ProviderBadge provider={asset.provider} sourceStatus={asset.sourceStatus} />
                        <RiskBadge riskLevel={asset.riskLevel} />
                      </div>
                      <p className="truncate text-xs text-slate-400">{asset.name}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {hidden ? "••••" : formatBalance(asset.balanceFormatted)}
                </p>
                {!hidden && asset.fiatValue != null ? (
                  <p className="text-xs text-slate-400">{formatFiat(asset.fiatValue, currency)}</p>
                ) : null}
                {!hidden ? <ChangeLabel pct={asset.change24hPercent} /> : null}

                <div className="mt-2 flex items-center justify-end gap-2">
                  {detailHref ? (
                    <Link href={detailHref} className="text-xs text-slate-400 hover:text-white">
                      Details
                    </Link>
                  ) : null}
                  {onHideToken && asset.type === "erc20" && asset.tokenAddress ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onHideToken(asset)}
                      className="rounded-full border border-slate-600 px-2.5 py-1 text-xs text-slate-200 transition hover:border-slate-400 hover:text-white disabled:opacity-60"
                    >
                      {isBusy ? "Hiding…" : "Hide"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
