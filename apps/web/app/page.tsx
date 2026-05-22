import Link from "next/link";
import { CapabilityStatusBoard } from "@/components/capability-status-board";
import { SwapComposer } from "@/components/swap-composer";
import { NetworkPill } from "@/components/ui/network-pill";
import { PremiumCard } from "@/components/ui/premium-card";
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

function MiniMarketRow({ token }: { token: ExploreTokenItem }) {
  return (
    <Link href={buildExploreTokenHref(token)} className="flex items-center gap-3 rounded-2xl border border-fuchsia-100 bg-white/70 p-3 transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-white">
      {token.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={token.logoUrl} alt={token.symbol} className="h-9 w-9 rounded-full bg-fuchsia-50" />
      ) : (
        <span className="token-orb h-9 w-9 text-xs font-bold">{token.symbol.slice(0, 3)}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{token.name}</span>
        <span className="block text-xs text-slate-500">{token.symbol}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-slate-950">{formatUsd(token.price)}</span>
        <span className={token.change24h == null ? "text-xs text-slate-400" : token.change24h >= 0 ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-rose-600"}>
          {token.change24h == null ? "—" : `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}%`}
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
    <section className="acorus-shell">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10">
      <div className="app-surface subtle-grid grid gap-6 rounded-[2rem] p-6 md:p-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <NetworkPill label="EVM 0x live" />
            <NetworkPill label="Solana SOL/SPL" />
            <NetworkPill label="Jupiter and Rango review" status="soon" />
          </div>
          <span className="section-kicker">Acorus Wallet</span>
          <h1 className="max-w-4xl text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-6xl">
            One wallet for markets, swaps and Web3 approvals
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-600">
            Create or import a wallet, inspect live token pages, receive assets across EVM, Solana and Tron, and route EVM swaps through backend 0x quotes with explicit extension approval.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/create" className="button-primary inline-flex">Create wallet</Link>
            <Link href="/import" className="button-secondary inline-flex">Import wallet</Link>
            <Link href="/extension" className="button-secondary inline-flex">Install extension</Link>
            <Link href="/explore" className="button-secondary inline-flex">Explore markets</Link>
          </div>
        </div>

        <PremiumCard className="p-4 sm:p-5">
          <SwapComposer
            compact
            portfolioAssets={[]}
            title="Swap"
            description="Choose a route, get a live backend quote, then review every approval or swap inside the Acorus extension."
          />
        </PremiumCard>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["EVM swaps", "0x quotes, allowance review, extension confirmation."],
          ["Solana wallet", "Live SOL/SPL portfolio and guarded send foundation."],
          ["Token pages", "Charts, links, explorers, market cap and instant swap panel."],
          ["Security", "Seed, passcode and signing stay client-side."],
        ].map(([title, copy]) => (
          <div key={title} className="premium-card p-5">
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="section-kicker">Live discovery</span>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Trending now</h2>
            </div>
            <Link href="/explore" className="button-secondary px-4 py-2 text-sm">Open Explore</Link>
          </div>
          <div className="grid gap-2">
            {trending.length ? trending.map((token) => <MiniMarketRow key={token.id} token={token} />) : (
              <p className="text-sm text-slate-500">Trending data is temporarily unavailable.</p>
            )}
          </div>
        </div>

        <div className="panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="section-kicker">Market cap</span>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Top tokens</h2>
            </div>
            <Link href="/explore" className="button-secondary px-4 py-2 text-sm">See all</Link>
          </div>
          <div className="grid gap-2">
            {top.length ? top.map((token) => <MiniMarketRow key={token.id} token={token} />) : (
              <p className="text-sm text-slate-500">Top token data is temporarily unavailable.</p>
            )}
          </div>
        </div>
      </div>

      <CapabilityStatusBoard />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            href: "/create",
            title: "Create wallet",
            description: "Новый EVM-кошелек с локальной seed phrase и passcode.",
          },
          {
            href: "/import",
            title: "Import wallet",
            description: "Импорт по seed phrase с локальным шифрованием vault.",
          },
          {
            href: "/view-only",
            title: "View-only wallet",
            description: "Просмотр балансов без приватного ключа и отправки.",
          },
          {
            href: "/practice",
            title: "Practice wallet",
            description: "Учебный режим без реальных средств и настоящего seed.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="premium-card p-6 transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
          >
            <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
            <div className="mt-5 text-sm font-medium text-fuchsia-700">Open flow →</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          "Seed phrase никогда не отправляется на сервер.",
          "Подпись и расшифровка выполняются только на клиенте.",
          "Каждая сеть проходит через единую capability matrix: live, preview, planned или blocked.",
        ].map((item) => (
          <div
            key={item}
            className="data-card rounded-2xl p-5 text-sm text-slate-600"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
    </section>
  );
}
