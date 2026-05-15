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

  return (
    <section className="page max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-sm text-slate-400 hover:text-white">← Wallet</Link>
        <span className="text-slate-600">/</span>
        <p className="text-sm text-slate-300 truncate">{tokenAddress}</p>
      </div>

      <div className="panel space-y-4">
        <div>
          <p className="text-xs text-slate-400">{chain?.name ?? `Chain ${chainId}`}</p>
          <h1 className="text-2xl font-semibold mt-1">
            {price?.symbol ?? "Token"} Details
          </h1>
          <p className="text-xs text-slate-500 mt-1 break-all">{tokenAddress}</p>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
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
