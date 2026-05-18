import { fetchExploreTrending, fetchExploreTop, fetchExploreMemes } from "@/lib/api";
import type { ExploreTokenItem } from "@acorus/shared";

function PriceChangeBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  const positive = value >= 0;
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function formatUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value > 0.001) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(2)}`;
}

function TokenCard({ token, rank }: { token: ExploreTokenItem; rank?: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      {rank != null && (
        <span className="w-6 text-center text-xs font-semibold text-slate-500">{rank}</span>
      )}
      {token.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={token.logoUrl}
          alt={token.symbol}
          className="h-8 w-8 rounded-full bg-slate-800"
          width={32}
          height={32}
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
          {token.symbol.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-white truncate">{token.name}</p>
          <span className="text-xs text-slate-500 shrink-0">{token.symbol}</span>
        </div>
        {token.marketCapUsd != null && (
          <p className="text-xs text-slate-400">MCap {formatUsd(token.marketCapUsd)}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {token.price != null && (
          <p className="text-sm font-semibold text-white">{formatUsd(token.price)}</p>
        )}
        <PriceChangeBadge value={token.change24h} />
      </div>
    </div>
  );
}

function MemeCard({ token }: { token: ExploreTokenItem }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-900/40 bg-amber-950/20">
      {token.bannerUrl || token.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={token.bannerUrl ?? token.logoUrl ?? ""}
          alt={token.name}
          className="h-24 w-full object-cover"
          width={420}
          height={96}
        />
      ) : null}
      <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-900/40 text-xs font-bold text-amber-400">
          {token.chainKey?.slice(0, 3).toUpperCase() ?? token.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate">{token.name}</p>
          <p className="text-xs text-slate-400 truncate">
            {token.chainKey ?? "dex"} · {token.tokenAddress?.slice(0, 10)}…
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
            Boosted
          </span>
          {token.pairUrl && (
            <a
              href={token.pairUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              View pair
            </a>
          )}
        </div>
      </div>
      {token.description ? (
        <p className="max-h-16 overflow-hidden text-xs leading-5 text-slate-300">
          {token.description}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {token.websiteUrl ? (
          <a href={token.websiteUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
            Site
          </a>
        ) : null}
        {token.twitterUrl ? (
          <a href={token.twitterUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
            X
          </a>
        ) : null}
        {token.telegramUrl ? (
          <a href={token.telegramUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
            TG
          </a>
        ) : null}
      </div>
      </div>
    </div>
  );
}

export default async function ExplorePage() {
  const [trendingResult, topResult, memesResult] = await Promise.allSettled([
    fetchExploreTrending(),
    fetchExploreTop(),
    fetchExploreMemes(),
  ]);

  const trending = trendingResult.status === "fulfilled" ? trendingResult.value.items : [];
  const top = topResult.status === "fulfilled" ? topResult.value.items : [];
  const memes = memesResult.status === "fulfilled" ? memesResult.value.items : [];

  return (
    <section className="page space-y-8">
      <div className="app-surface grid gap-5 rounded-[2rem] p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Explore</p>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Market radar</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-300">
            Trending search, top market-cap assets and boosted meme discovery
            from CoinGecko and DexScreener. Built as the first wallet-native
            trading discovery screen.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
            <p className="text-lg font-semibold">{trending.length}</p>
            <p>Trending</p>
          </div>
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-100">
            <p className="text-lg font-semibold">{top.length}</p>
            <p>Top</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-100">
            <p className="text-lg font-semibold">{memes.length}</p>
            <p>Memes</p>
          </div>
        </div>
      </div>

      {/* Trending */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Trending Tokens</h2>
          <span className="rounded-full border border-emerald-800 bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            Live
          </span>
        </div>
        {trending.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {trending.slice(0, 14).map((token, i) => (
              <TokenCard key={token.id} token={token} rank={i + 1} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Trending data unavailable. Check API connection.
          </p>
        )}
      </div>

      {/* Top Tokens */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Top Tokens</h2>
          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs font-semibold text-slate-300">
            Market Cap
          </span>
        </div>
        {top.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {top.map((token, i) => (
              <TokenCard key={token.id} token={token} rank={i + 1} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Top tokens unavailable.</p>
        )}
      </div>

      {/* Meme Radar */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Meme Radar</h2>
          <span className="rounded-full border border-amber-800 bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-400">
            DexScreener Boosts
          </span>
        </div>
        <p className="text-xs text-amber-400/80">
          Boosted tokens are paid promotions. Not investment advice. Always DYOR.
        </p>
        {memes.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {memes.slice(0, 12).map((token) => (
              <MemeCard key={token.id} token={token} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Meme radar unavailable.</p>
        )}
      </div>
    </section>
  );
}
