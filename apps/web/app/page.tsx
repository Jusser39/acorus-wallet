import Link from "next/link";
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
];

export default async function Home() {
  const [trending, top] = await Promise.all([
    fetchExploreTrending().then((response) => response.items.slice(0, 6)).catch(() => []),
    fetchExploreTop({ view: "top", limit: 6 }).then((response) => response.items.slice(0, 6)).catch(() => []),
  ]);
  const discoveryTokens = top.length ? top : trending.length ? trending : FALLBACK_DISCOVERY_TOKENS;
  const pulse = buildFearGreedPulse(discoveryTokens);
  const pulseColor = pulse.score <= 42 ? "#f43f5e" : pulse.score <= 58 ? "#f59e0b" : "#22c55e";

  return (
    <main className="relative flex min-h-[calc(100vh-80px)] flex-col items-center justify-start pt-10 px-4">
      <div className="w-full max-w-[480px]">
        <SwapComposer
          portfolioAssets={[]}
          title="Swap"
          description="Exchange any token across EVM, Solana, and Bitcoin with universal routing."
        />
      </div>

      <div className="mt-16 w-full max-w-4xl px-4 text-[var(--text-secondary)] space-y-8">
        <section className="uni-card p-6 border-none shadow-sm bg-[var(--surface-inset)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Token Discovery</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Live tracking of market movements.</p>
            </div>
            <Link href="/explore" className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">
              Explore all →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoveryTokens.slice(0, 6).map((token) => (
              <Link
                key={token.id}
                href={buildExploreTokenHref(token)}
                className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-[var(--surface-hover)] border border-[var(--border-light)] bg-[var(--surface-base)]"
              >
                {token.logoUrl ? (
                  <img src={token.logoUrl} alt={token.symbol} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[var(--surface-active)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)]">
                    {token.symbol.slice(0, 3)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{token.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{token.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{formatUsd(token.price)}</div>
                  <div className={`text-xs font-medium ${token.change24h && token.change24h >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {token.change24h == null ? "—" : `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-2 gap-6">
          <div className="uni-card p-6 border-none shadow-sm bg-[var(--surface-inset)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Security Model</h2>
            <p className="text-sm leading-relaxed mb-4 text-[var(--text-secondary)]">
              Your keys never leave your device. All transactions require explicit confirmation. Backend swap providers receive only public quote metadata and never receive key material.
            </p>
            <Link href="/security" className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">
              Learn more →
            </Link>
          </div>
          
          <div className="uni-card p-6 border-none shadow-sm bg-[var(--surface-inset)]">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Market Fear & Greed</h2>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs" 
                style={{ backgroundColor: pulseColor }}
              >
                {pulse.score}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-4">
              Current market mood is <strong className="text-[var(--text-primary)]">{pulse.label.toLowerCase()}</strong>. 
              {pulse.positiveCount} tokens rising, {pulse.negativeCount} tokens falling in our tracked sample.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
