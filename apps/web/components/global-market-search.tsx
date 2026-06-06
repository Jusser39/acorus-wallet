"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { searchMarket, type MarketSearchResult } from "@/lib/api";

import { useFormatter } from "@/hooks/use-formatter";

function groupLabel(kind: MarketSearchResult["kind"]): string {
  if (kind === "pool") return "Pool";
  if (kind === "wallet") return "Wallet";
  return "Token";
}

export function GlobalMarketSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useFormatter();
  const normalized = query.trim();
  const showResults = open && normalized.length >= 2;

  useEffect(() => {
    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchMarket(normalized)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 220);

    return () => window.clearTimeout(timer);
  }, [normalized]);

  const rows = useMemo(() => results.slice(0, 10), [results]);

  return (
    <div className="relative w-full max-w-xl">
      <div className="market-search-shell">
        <span className="market-search-icon">⌕</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search tokens, pools, wallets..."
          className="market-search-input"
        />
        <span className="market-search-key">/</span>
      </div>

      {showResults ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[1.3rem] border border-fuchsia-100 bg-white text-slate-950 shadow-[0_28px_80px_rgba(88,28,135,0.18)]">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Searching...</div>
          ) : rows.length ? (
            <div className="max-h-96 overflow-y-auto p-2">
              {rows.map((item) => {
                const external = /^https?:\/\//u.test(item.href);
                const content = (
                  <>
                    {item.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logoUrl} alt={item.label} className="h-9 w-9 rounded-full bg-slate-100" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {(item.symbol ?? item.label).slice(0, 3).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{item.label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          {groupLabel(item.kind)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.subtitle}{item.liquidityUsd ? ` · liq ${formatCurrency(item.liquidityUsd)}` : ""}
                      </span>
                    </span>
                  </>
                );

                return external ? (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-100"
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-100"
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500">No matching tokens, pools, or wallets yet.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
