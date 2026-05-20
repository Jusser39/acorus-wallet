"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchExploreMemes, fetchExploreTop, fetchExploreTrending, type ExploreFeedKind } from "@/lib/api";
import { buildExploreTokenHref } from "@/lib/token-routes";
import type { ExploreTokenItem } from "@acorus/shared";

type ExploreTab = "trending" | ExploreFeedKind | "memes";

type Props = {
  initialTrending: ExploreTokenItem[];
  initialTop: ExploreTokenItem[];
  initialMemes: ExploreTokenItem[];
};

const TAB_LABELS: Record<ExploreTab, string> = {
  trending: "Trending tokens",
  top: "Top tokens",
  gainers: "Top gainers",
  losers: "Top losers",
  memes: "Top memes",
};

const PAGE_SIZE = 12;

const TAB_SHORT_LABELS: Record<ExploreTab, string> = {
  trending: "Trending",
  top: "Top tokens",
  gainers: "Top gainers",
  losers: "Top losers",
  memes: "Top memes",
};

function formatUsd(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value > 0.001) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(2)}`;
}

function PriceChangeBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-slate-400">-</span>;
  const positive = value >= 0;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function TokenRow({ token, rank }: { token: ExploreTokenItem; rank: number }) {
  const href = buildExploreTokenHref(token);

  return (
    <Link href={href} className="explore-row">
      <span className="w-7 text-right text-xs font-semibold text-slate-400">{rank}</span>
      {token.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.logoUrl} alt={token.symbol} className="h-9 w-9 rounded-full bg-fuchsia-50" />
      ) : (
        <span className="token-orb h-9 w-9 text-xs font-bold">{token.symbol.slice(0, 3)}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-950">{token.name}</span>
        <span className="block truncate text-xs text-slate-500">
          {token.symbol}
          {token.chainKey ? ` · ${token.chainKey}` : ""}
        </span>
      </span>
      <span className="hidden text-right sm:block">
        <span className="block text-sm font-semibold text-slate-950">{formatUsd(token.price)}</span>
        <span className="block text-xs text-slate-500">MCap {formatUsd(token.marketCapUsd)}</span>
      </span>
      <span className="text-right">
        <PriceChangeBadge value={token.change24h} />
      </span>
    </Link>
  );
}

function MemeCard({ token }: { token: ExploreTokenItem }) {
  const href = buildExploreTokenHref(token);

  return (
    <div className="premium-card overflow-hidden p-4">
      <div className="flex items-start gap-3">
        {token.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={token.logoUrl} alt={token.symbol} className="h-10 w-10 rounded-full bg-fuchsia-50" />
        ) : (
          <span className="token-orb h-10 w-10 text-xs font-bold">{token.symbol.slice(0, 3)}</span>
        )}
        <div className="min-w-0 flex-1">
          <Link href={href} className="block truncate text-base font-semibold text-slate-950 hover:text-fuchsia-700">
            {token.name}
          </Link>
          <p className="truncate text-xs text-slate-500">{token.chainKey ?? "dex"} · {token.symbol}</p>
        </div>
        <PriceChangeBadge value={token.change24h} />
      </div>
      {token.description ? (
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{token.description}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={href} className="button-secondary px-3 py-2 text-xs">Token page</Link>
        {token.pairUrl ? <a href={token.pairUrl} target="_blank" rel="noreferrer" className="button-secondary px-3 py-2 text-xs">Pair</a> : null}
        {token.websiteUrl ? <a href={token.websiteUrl} target="_blank" rel="noreferrer" className="button-secondary px-3 py-2 text-xs">Website</a> : null}
        {token.twitterUrl ? <a href={token.twitterUrl} target="_blank" rel="noreferrer" className="button-secondary px-3 py-2 text-xs">X</a> : null}
      </div>
    </div>
  );
}

export function ExploreClient({ initialTrending, initialTop, initialMemes }: Props) {
  const [tab, setTab] = useState<ExploreTab>("trending");
  const [page, setPage] = useState(1);
  const [cache, setCache] = useState<Record<ExploreTab, ExploreTokenItem[]>>({
    trending: initialTrending,
    top: initialTop,
    gainers: [],
    losers: [],
    memes: initialMemes,
  });
  const [loading, setLoading] = useState(false);

  const items = cache[tab] ?? [];
  const visible = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);
  const canPrev = page > 1;
  const canNext = page * PAGE_SIZE < items.length || (items.length >= PAGE_SIZE && tab !== "memes");

  async function selectTab(next: ExploreTab) {
    setTab(next);
    setPage(1);
    if (cache[next]?.length) return;

    setLoading(true);
    try {
      const response = next === "trending"
        ? await fetchExploreTrending()
        : next === "memes"
          ? await fetchExploreMemes()
          : await fetchExploreTop({ view: next, limit: 50 });
      setCache((current) => ({ ...current, [next]: response.items }));
    } finally {
      setLoading(false);
    }
  }

  async function nextPage() {
    const nextPageNumber = page + 1;
    if (nextPageNumber * PAGE_SIZE > items.length && (tab === "top" || tab === "gainers" || tab === "losers")) {
      setLoading(true);
      try {
        const response = await fetchExploreTop({ view: tab, page: nextPageNumber, limit: PAGE_SIZE });
        setCache((current) => ({ ...current, [tab]: [...(current[tab] ?? []), ...response.items] }));
      } finally {
        setLoading(false);
      }
    }
    setPage(nextPageNumber);
  }

  return (
    <section className="page space-y-8">
      <div className="app-surface subtle-grid grid gap-5 rounded-[2rem] p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-3">
          <span className="section-kicker">Explore</span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Market radar</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Discover tokens, pools and meme markets from CoinGecko and DexScreener in a wallet-native trading screen.
          </p>
        </div>
        <select
          value={tab}
          onChange={(event) => void selectTab(event.target.value as ExploreTab)}
          className="light-field max-w-xs rounded-full"
          aria-label="Explore section"
        >
          {Object.entries(TAB_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="panel space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{TAB_LABELS[tab]}</h2>
            <p className="text-sm text-slate-500">
              {tab === "memes" ? "Meme Radar is separated into its own tab." : "Use pages to scan more markets without leaving the wallet."}
            </p>
          </div>
          <div className="flex gap-2">
            {Object.entries(TAB_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => void selectTab(value as ExploreTab)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${tab === value ? "bg-fuchsia-600 text-white" : "bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100"}`}
              >
                  {TAB_SHORT_LABELS[value as ExploreTab] ?? label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading markets...</p> : null}
        {!loading && visible.length === 0 ? (
          <p className="text-sm text-slate-500">Market data is temporarily unavailable.</p>
        ) : tab === "memes" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((token) => <MemeCard key={token.id} token={token} />)}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] border border-fuchsia-100 bg-white">
            {visible.map((token, index) => (
              <TokenRow key={`${token.id}-${index}`} token={token} rank={(page - 1) * PAGE_SIZE + index + 1} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button type="button" className="button-secondary px-4 py-2 text-sm" disabled={!canPrev} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-600">Page {page}</span>
          <button type="button" className="button-primary px-4 py-2 text-sm" disabled={!canNext || loading} onClick={() => void nextPage()}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
