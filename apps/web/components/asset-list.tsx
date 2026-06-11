"use client";

import { normalizeAddressForChain } from "@acorus/shared";
import Link from "next/link";
import type { PortfolioAssetView } from "@/lib/portfolio";
import type { FiatCurrency } from "@/lib/api";
import { ChainFamilyBadge } from "@/components/universal-badges";

interface Props {
  assets: PortfolioAssetView[];
  hidden: boolean;
  currency: FiatCurrency;
  chainId: number;
  chainFamily?: string;
  loading?: boolean;
  onHideToken?: (asset: PortfolioAssetView) => void;
  busyTokenKey?: string | null;
  selectedAssetKey?: string | null;
  onSelectAsset?: (asset: PortfolioAssetView) => void;
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
  chainFamily,
  loading,
  onHideToken,
  busyTokenKey,
  selectedAssetKey,
  onSelectAsset,
}: Props) {
  if (loading) {
      return (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="premium-card animate-pulse p-4">
              <div className="h-5 w-24 rounded bg-slate-700/50" />
            </div>
          ))}
        </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="premium-card p-4 text-sm text-slate-400">
        No assets found for this chain.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) => {
        const key = asset.tokenAddress ?? `native-${asset.symbol}`;
        const isErc20WithAddress = asset.type === "erc20" && asset.tokenAddress;
        const isSplWithAddress = chainFamily === "solana" && asset.tokenAddress && asset.type !== "native";
        const detailHref =
          isErc20WithAddress
            ? `/tokens/${chainId}/${asset.tokenAddress}`
            : isSplWithAddress
              ? `/tokens/${chainId}/${asset.tokenAddress}?family=solana&symbol=${encodeURIComponent(asset.symbol)}`
              : null;
        const isBusy = busyTokenKey === tokenActionKey(asset);
        const selectionKey = tokenActionKey(asset);
        const isSelected = selectedAssetKey === selectionKey;

        return (
          <div
            key={key}
            role={onSelectAsset ? "button" : undefined}
            tabIndex={onSelectAsset ? 0 : undefined}
            onClick={() => onSelectAsset?.(asset)}
            onKeyDown={(event) => {
              if (!onSelectAsset) {
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectAsset(asset);
              }
            }}
            className={`premium-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-fuchsia-300/20 ${
              isSelected
                ? "border-fuchsia-300/35 shadow-[0_18px_44px_rgba(255,70,183,0.22)]"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {detailHref ? (
                  <Link href={detailHref} className="block">
                    <div className="flex items-center gap-3">
                      {asset.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.logoUrl} alt={asset.symbol} className="h-11 w-11 shrink-0 rounded-full bg-slate-800 object-cover" />
                      ) : (
                        <div className="token-orb h-11 w-11 shrink-0 text-xs font-bold">
                          {asset.symbol.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{asset.symbol}</p>
                          {chainFamily && chainFamily !== "evm" && (
                            <ChainFamilyBadge family={chainFamily as import("@acorus/shared").ChainFamily} />
                          )}
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
                    {asset.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.logoUrl} alt={asset.symbol} className="h-11 w-11 shrink-0 rounded-full bg-slate-800 object-cover" />
                    ) : (
                      <div className="token-orb h-11 w-11 shrink-0 text-xs font-bold">
                        {asset.symbol.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{asset.symbol}</p>
                        {chainFamily && chainFamily !== "evm" && (
                          <ChainFamilyBadge family={chainFamily as import("@acorus/shared").ChainFamily} />
                        )}
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
                  {onHideToken && asset.type === "erc20" && asset.tokenAddress && (!chainFamily || chainFamily === "evm") ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={(event) => {
                        event.stopPropagation();
                        onHideToken(asset);
                      }}
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
