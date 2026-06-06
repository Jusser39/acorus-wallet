"use client";

import Link from "next/link";
import { useFormatter } from "@/hooks/use-formatter";
import { buildExploreTokenHref } from "@/lib/token-routes";
import type { ExploreTokenItem } from "@acorus/shared";

export function MagicMarketRow({ token }: { token: ExploreTokenItem }) {
  const { formatCurrency } = useFormatter();

  return (
    <Link
      href={buildExploreTokenHref(token)}
      className="flex items-center gap-3 rounded-3xl border border-white/50 bg-white/45 p-3 transition hover:-translate-y-0.5 hover:bg-white/70"
    >
      {token.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.logoUrl} alt={token.symbol} className="h-10 w-10 rounded-full bg-white" />
      ) : (
        <span className="magic-orb h-10 w-10 text-[11px] font-black text-white">
          {token.symbol.slice(0, 3)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{token.name}</span>
        <span className="block text-xs font-semibold text-slate-500">{token.symbol}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-black text-slate-950">{formatCurrency(token.price)}</span>
        <span
          className={
            token.change24h == null
              ? "text-xs text-slate-400"
              : token.change24h >= 0
                ? "text-xs font-black text-emerald-600"
                : "text-xs font-black text-rose-600"
          }
        >
          {token.change24h == null
            ? "—"
            : `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%`}
        </span>
      </span>
      <span className="hidden rounded-full bg-gradient-to-r from-cyan-300 via-violet-500 to-pink-400 px-3 py-2 text-xs font-black text-white shadow-sm sm:inline-flex">
        Swap
      </span>
    </Link>
  );
}
