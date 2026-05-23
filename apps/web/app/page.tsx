import Link from "next/link";
import { AcorusMage } from "@/components/acorus-mage";
import { SwapComposer } from "@/components/swap-composer";
import { fetchExploreTop, fetchExploreTrending } from "@/lib/api";
import { buildExploreTokenHref } from "@/lib/token-routes";
import type { ExploreTokenItem } from "@acorus/shared";

function formatUsd(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(value < 1 ? 4 : 2)}`;
}

function MagicMarketRow({ token }: { token: ExploreTokenItem }) {
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
        <span className="block text-sm font-black text-slate-950">{formatUsd(token.price)}</span>
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
    </Link>
  );
}

export default async function Home() {
  const [trending, top] = await Promise.all([
    fetchExploreTrending().then((response) => response.items.slice(0, 4)).catch(() => []),
    fetchExploreTop({ view: "top", limit: 4 }).then((response) => response.items.slice(0, 4)).catch(() => []),
  ]);

  return (
    <main className="magic-shell">
      <section className="magic-container py-8">
        <div className="magic-home-stage">
          <div className="magic-home-grid">
            <div className="magic-home-side">
              <section className="magic-mini-panel p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">Portfolio</h2>
                  <span className="rounded-full bg-white/50 px-3 py-1 text-xs font-bold">local</span>
                </div>
                <div className="mt-4 text-4xl font-black tracking-tight">$—</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Connect the extension or unlock a local vault to calculate live balances.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link href="/create" className="magic-button px-4 py-3 text-center text-sm">Create</Link>
                  <Link href="/import" className="magic-button-secondary px-4 py-3 text-center text-sm">Import</Link>
                </div>
              </section>

              <section className="magic-mini-panel magic-compact-swap p-4">
                <SwapComposer
                  compact
                  portfolioAssets={[]}
                  title="Swap"
                  description="0x EVM live quotes. Jupiter and Rango routes stay behind review until adapters are ready."
                />
              </section>
            </div>

            <div className="magic-stage-center">
              <AcorusMage />
              <div className="absolute left-1/2 top-10 -translate-x-1/2 rounded-full border border-white/70 bg-white/54 px-5 py-3 text-sm font-black uppercase tracking-[0.28em] text-violet-800 shadow-[0_18px_44px_rgba(85,166,255,0.18)] backdrop-blur-xl">
                Acorus guardian
              </div>
            </div>

            <div className="magic-home-side">
              <section className="magic-mini-panel p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">Trending</h2>
                  <Link href="/explore" className="text-sm font-bold text-violet-700">Explore</Link>
                </div>
                <div className="mt-4 grid gap-3">
                  {trending.length ? (
                    trending.slice(0, 3).map((token) => <MagicMarketRow key={token.id} token={token} />)
                  ) : (
                    <p className="text-sm text-slate-600">Market feed is temporarily unavailable.</p>
                  )}
                </div>
              </section>

              <section className="magic-mini-panel p-5">
                <h2 className="text-xl font-black">Market pulse</h2>
                <div className="mt-5 flex h-28 items-end gap-3">
                  {[30, 54, 78, 46, 72, 90].map((height, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-t-xl bg-gradient-to-t from-violet-500 via-pink-400 to-cyan-300"
                      style={{ height }}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["0x swaps", "Backend-proxied EVM routes with extension approval."],
            ["Solana send", "SOL and SPL transfers behind local vault confirmation."],
            ["Explore", "Token discovery, charts, metrics and market pages."],
            ["Security", "Seed, passcode and signing stay client-side."],
          ].map(([title, copy]) => (
            <div key={title} className="magic-panel p-5">
              <h3 className="text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="magic-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">Live discovery</p>
                <h2 className="mt-2 text-2xl font-black">Top tokens</h2>
              </div>
              <Link href="/explore" className="magic-button-secondary px-4 py-2 text-sm">See all</Link>
            </div>
            <div className="mt-4 grid gap-2">
              {top.length ? (
                top.map((token) => <MagicMarketRow key={token.id} token={token} />)
              ) : (
                <p className="text-sm text-slate-600">Top token data is temporarily unavailable.</p>
              )}
            </div>
          </div>

          <div className="magic-panel p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">Safety model</p>
            <h2 className="mt-2 text-2xl font-black">Local keys, explicit approvals</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600">
              <p>Seed phrase, passcode, and transaction signing stay inside the client or extension vault.</p>
              <p>Backend swap providers receive only public quote metadata and never receive key material.</p>
              <p>Each send, approval, and swap execution is reviewed before broadcast.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
