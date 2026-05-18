"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type FeaturedToken = {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  accent: string;
  changeLabel: string;
  insight: string;
  x: number;
  y: number;
  size: number;
  delay: string;
};

const FEATURED_TOKENS: FeaturedToken[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    chain: "Mainnet",
    accent: "#627EEA",
    changeLabel: "+2.84%",
    insight: "Blue-chip liquidity and the default route for DeFi execution.",
    x: 8,
    y: 16,
    size: 88,
    delay: "0s",
  },
  {
    id: "uni",
    symbol: "UNI",
    name: "Uniswap",
    chain: "Ethereum",
    accent: "#FF46B7",
    changeLabel: "+5.12%",
    insight: "Governance and routing anchor for the premium swap surface.",
    x: 20,
    y: 64,
    size: 76,
    delay: "0.8s",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    chain: "Base",
    accent: "#2775CA",
    changeLabel: "+0.03%",
    insight: "Stable quote leg for receive, swap, and bridge-ready flows.",
    x: 70,
    y: 14,
    size: 82,
    delay: "1.2s",
  },
  {
    id: "pepe",
    symbol: "PEPE",
    name: "Pepe",
    chain: "Ethereum",
    accent: "#39D98A",
    changeLabel: "+4.48%",
    insight: "Meme radar, trending discovery, and fast token spotlighting.",
    x: 74,
    y: 50,
    size: 110,
    delay: "0.4s",
  },
  {
    id: "wbtc",
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    chain: "Ethereum",
    accent: "#F7931A",
    changeLabel: "+1.66%",
    insight: "BTC exposure inside the same self-custody portfolio shell.",
    x: 4,
    y: 82,
    size: 78,
    delay: "1.6s",
  },
  {
    id: "arb",
    symbol: "ARB",
    name: "Arbitrum",
    chain: "Arbitrum",
    accent: "#28A0F0",
    changeLabel: "+3.01%",
    insight: "Fast L2 routing for low-friction swaps and sending.",
    x: 86,
    y: 74,
    size: 92,
    delay: "0.9s",
  },
  {
    id: "matic",
    symbol: "POL",
    name: "Polygon",
    chain: "Polygon",
    accent: "#8247E5",
    changeLabel: "+2.19%",
    insight: "Multichain continuity for everyday spending and app discovery.",
    x: 58,
    y: 82,
    size: 80,
    delay: "1.4s",
  },
  {
    id: "bnb",
    symbol: "BNB",
    name: "BNB Chain",
    chain: "BNB Smart Chain",
    accent: "#F3BA2F",
    changeLabel: "+1.28%",
    insight: "High-volume routing and token coverage for universal wallet rails.",
    x: 0,
    y: 30,
    size: 72,
    delay: "0.6s",
  },
];

type Props = {
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  compact?: boolean;
};

export function TokenDiscoveryHero({
  eyebrow = "Acorus premium shell",
  title = "Обменивайте, отправляйте и выбирайте токены в живом wallet-интерфейсе",
  description = "Теперь hero повторяет поведение референса ближе к real product UX: мягкий светлый stage, плавающие токены и выделение выбранной монеты без ухода от non-custodial boundary.",
  primaryHref = "/create",
  primaryLabel = "Create wallet",
  secondaryHref = "/swap",
  secondaryLabel = "Open swap",
  compact = false,
}: Props) {
  const [selectedId, setSelectedId] = useState(FEATURED_TOKENS[3]?.id ?? FEATURED_TOKENS[0]!.id);

  const selectedToken = useMemo(
    () => FEATURED_TOKENS.find((token) => token.id === selectedId) ?? FEATURED_TOKENS[0]!,
    [selectedId],
  );

  return (
    <section className={`token-stage ${compact ? "token-stage--compact" : ""}`}>
      <div className="token-stage__mesh" />
      {FEATURED_TOKENS.map((token) => (
        <button
          key={token.id}
          type="button"
          className="token-stage__orb"
          data-selected={token.id === selectedToken.id}
          style={{
            left: `${token.x}%`,
            top: `${token.y}%`,
            width: `${token.size}px`,
            height: `${token.size}px`,
            animationDelay: token.delay,
            ["--token-accent" as string]: token.accent,
          }}
          onClick={() => setSelectedId(token.id)}
          aria-label={`Highlight ${token.name}`}
        >
          <span className="token-stage__orb-ring" />
          <span className="token-stage__orb-core">
            {token.symbol}
          </span>
        </button>
      ))}

      <div className="relative z-10 grid min-h-[40rem] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-3xl space-y-5">
          <span className="section-kicker !border-slate-900/10 !bg-white/70 !text-slate-700">
            {eyebrow}
          </span>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={primaryHref} className="button-primary inline-flex">
              {primaryLabel}
            </Link>
            <Link href={secondaryHref} className="button-secondary inline-flex !border-slate-900/10 !bg-white/70 !text-slate-900 hover:!bg-white">
              {secondaryLabel}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Select any token", "Клик по orb выделяет монету и обновляет spotlight."],
              ["Wallet-grade shell", "Навигация, swap, send и portfolio собираются в один UI язык."],
              ["Client-side custody", "Seed, unlock и подпись не покидают клиент/extension boundary."],
            ].map(([label, text]) => (
              <div key={label} className="token-stage__info-card">
                <p className="text-sm font-semibold text-slate-950">{label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="token-stage__main-card w-full max-w-[27rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Selected token spotlight</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {selectedToken.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedToken.chain} · {selectedToken.changeLabel}
                </p>
              </div>
              <div
                className="token-stage__selected-badge"
                style={{ ["--token-accent" as string]: selectedToken.accent }}
              >
                {selectedToken.symbol}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="token-stage__swap-row">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Sell</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-950">0</p>
                  <p className="mt-1 text-xs text-slate-400">0 $</p>
                </div>
                <button
                  type="button"
                  className="token-stage__token-pill"
                  style={{ ["--token-accent" as string]: selectedToken.accent }}
                >
                  <span className="token-stage__token-dot">{selectedToken.symbol.slice(0, 1)}</span>
                  {selectedToken.symbol}
                </button>
              </div>
              <div className="flex justify-center">
                <span className="token-stage__arrow">↓</span>
              </div>
              <div className="token-stage__swap-row">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Buy</p>
                  <p className="mt-2 text-4xl font-semibold text-slate-950">0</p>
                  <p className="mt-1 text-xs text-slate-400">Choose a token</p>
                </div>
                <button type="button" className="button-primary !px-4 !py-2.5 !text-sm">
                  Use {selectedToken.symbol}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-slate-900/8 bg-white/72 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Highlighted now
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {selectedToken.name}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {selectedToken.changeLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selectedToken.insight}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {FEATURED_TOKENS.slice(0, compact ? 5 : 6).map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    className="token-stage__mini-pill"
                    data-selected={token.id === selectedToken.id}
                    onClick={() => setSelectedId(token.id)}
                  >
                    {token.symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
