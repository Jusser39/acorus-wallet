import Link from "next/link";
import type { CSSProperties } from "react";
import { AcorusMagicStage } from "@/components/acorus-magic-stage";
import { SwapComposer } from "@/components/swap-composer";
import { fetchExploreTop, fetchExploreTrending } from "@/lib/api";
import { buildFearGreedPulse } from "@/lib/market-pulse";
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

const ACTION_LINKS = [
  { label: "Send", href: "/send", icon: "↗" },
  { label: "Receive", href: "/receive", icon: "↙" },
  { label: "Security", href: "/security", icon: "◇" },
  { label: "Explore", href: "/explore", icon: "◎" },
] as const;

const FALLBACK_DISCOVERY_TOKENS: ExploreTokenItem[] = [
  {
    id: "fallback-ethereum",
    symbol: "ETH",
    name: "Ethereum",
    logoUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    price: 2125.42,
    change24h: 0.82,
    marketCapUsd: 256_000_000_000,
    source: "fallback",
  },
  {
    id: "fallback-bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    logoUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    price: 78_240,
    change24h: 1.12,
    marketCapUsd: 1_550_000_000_000,
    source: "fallback",
  },
  {
    id: "fallback-solana",
    symbol: "SOL",
    name: "Solana",
    logoUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    price: 86.4,
    change24h: -0.74,
    marketCapUsd: 47_000_000_000,
    source: "fallback",
  },
  {
    id: "fallback-usdc",
    symbol: "USDC",
    name: "USD Coin",
    logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    price: 1,
    change24h: 0.01,
    marketCapUsd: 76_000_000_000,
    source: "fallback",
  },
  {
    id: "fallback-bonk",
    symbol: "BONK",
    name: "Bonk",
    logoUrl: "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
    price: 0.000018,
    change24h: 4.2,
    marketCapUsd: 1_400_000_000,
    source: "fallback",
  },
  {
    id: "fallback-chainlink",
    symbol: "LINK",
    name: "Chainlink",
    logoUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
    price: 16.8,
    change24h: 2.6,
    marketCapUsd: 11_000_000_000,
    source: "fallback",
  },
  {
    id: "fallback-pepe",
    symbol: "PEPE",
    name: "Pepe",
    logoUrl: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
    price: 0.000012,
    change24h: 6.4,
    marketCapUsd: 5_000_000_000,
    source: "fallback",
  },
  {
    id: "fallback-arbitrum",
    symbol: "ARB",
    name: "Arbitrum",
    logoUrl: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
    price: 1.24,
    change24h: 3.1,
    marketCapUsd: 5_200_000_000,
    source: "fallback",
  },
];

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
      <span className="hidden rounded-full bg-gradient-to-r from-cyan-300 via-violet-500 to-pink-400 px-3 py-2 text-xs font-black text-white shadow-sm sm:inline-flex">
        Swap
      </span>
    </Link>
  );
}

export default async function Home() {
  const [trending, top] = await Promise.all([
    fetchExploreTrending().then((response) => response.items.slice(0, 6)).catch(() => []),
    fetchExploreTop({ view: "top", limit: 6 }).then((response) => response.items.slice(0, 6)).catch(() => []),
  ]);
  const discoveryTokens = top.length ? top : trending.length ? trending : FALLBACK_DISCOVERY_TOKENS;
  const pulse = buildFearGreedPulse(discoveryTokens);
  const pulseColor = pulse.score <= 42 ? "#f43f5e" : pulse.score <= 58 ? "#f59e0b" : "#22c55e";

  return (
    <main className="magic-shell">
      <section className="magic-container py-8">
        <div className="magic-dashboard-grid">
          <section className="magic-dashboard-card magic-swap-panel-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">Acorus swap</p>
                <h2 className="mt-2 text-3xl font-black">Swap</h2>
              </div>
              <span className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-cyan-700">Live</span>
            </div>
            <SwapComposer
              compact
              portfolioAssets={[]}
              title="Swap"
              description="Pick a network, choose popular tokens, and review the final route in the extension."
            />
          </section>

          <section className="magic-dashboard-card magic-guardian-card">
            <div className="flex items-center justify-between gap-3">
              <span className="magic-token-chip px-4 py-2 text-sm font-black">Acorus Guardian</span>
              <Link href="/wallet" className="magic-button-secondary px-4 py-2 text-sm">Open wallet</Link>
            </div>
            <AcorusMagicStage pose="home" />
            <div className="mt-auto">
              <h1 className="text-4xl font-black tracking-tight text-slate-950">
                Your Multichain <span className="bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 bg-clip-text text-transparent">Magic Wallet</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600">
                EVM, Solana, Bitcoin and future chains in one guardian shell. Keys stay local; routes and approvals stay explicit.
              </p>
            </div>
          </section>

          <aside className="grid content-start gap-4">
            <section className="magic-dashboard-card magic-portfolio-panel-card">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Portfolio</p>
                <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-black text-violet-700">USD</span>
              </div>
              <div className="mt-4 text-5xl font-black tracking-tight">$—</div>
              <p className="mt-2 text-sm font-semibold text-emerald-600">Connect extension to calculate live balances.</p>
              <div className="mt-5 h-28 rounded-3xl border border-white/60 bg-[linear-gradient(180deg,rgba(139,92,246,0.22),rgba(124,247,255,0.02))]" />
              <div className="mt-4 rounded-full border border-white/70 bg-white/55 px-4 py-3 text-sm font-black text-slate-700">
                0x4f2b...8a91
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              {ACTION_LINKS.map(({ label, href, icon }) => (
                <Link key={label} href={href} className="magic-action-tile">
                  <span>{icon}</span>
                  <strong>{label}</strong>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <section className="magic-token-discovery mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">Live discovery</p>
                <h2 className="mt-2 text-2xl font-black">Token Discovery</h2>
              </div>
            </div>
            <Link href="/explore" className="magic-button-secondary px-5 py-3 text-sm">Explore all</Link>
          </div>
          <div className="magic-market-table">
            {discoveryTokens.slice(0, 6).map((token) => (
              <MagicMarketRow key={token.id} token={token} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[0.85fr_1fr]">
          <section className="magic-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Fear & Greed</h2>
                <p className="mt-1 text-sm text-slate-600">Market mood from tracked 24h token breadth.</p>
              </div>
              <div
                className="fear-greed-meter"
                style={{ "--fear-score": `${pulse.score}%`, "--fear-color": pulseColor } as CSSProperties}
              >
                <span>{pulse.score}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/50 bg-white/45 p-3 sm:col-span-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Market mood</div>
                <div className="mt-1 text-2xl font-black text-slate-950">{pulse.label}</div>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/42 p-3">
                <div className="text-xs font-bold text-slate-500">Rising 24h</div>
                <div className="mt-1 font-black text-emerald-600">{pulse.positiveCount}</div>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/42 p-3">
                <div className="text-xs font-bold text-slate-500">Falling 24h</div>
                <div className="mt-1 font-black text-rose-600">{pulse.negativeCount}</div>
              </div>
              <div className="rounded-2xl border border-white/50 bg-white/42 p-3">
                <div className="text-xs font-bold text-slate-500">Tracked</div>
                <div className="mt-1 font-black text-slate-950">{pulse.sampleSize}</div>
              </div>
            </div>
          </section>

          <section className="magic-panel p-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">Safety model</p>
            <h2 className="mt-2 text-2xl font-black">Local keys, explicit approvals</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600">
              <p>Seed phrase, passcode, and transaction signing stay inside the client or extension vault.</p>
              <p>Backend swap providers receive only public quote metadata and never receive key material.</p>
              <p>Each send, approval, and swap execution is reviewed before broadcast.</p>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
