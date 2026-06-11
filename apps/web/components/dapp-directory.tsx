"use client";

import { useMemo, useState } from "react";


type DappItem = {
  name: string;
  url: string;
  domain: string;
  chains: string[];
  description: string;
};

type DappCategory = {
  id: string;
  title: string;
  items: DappItem[];
};

const DAPP_CATEGORIES: DappCategory[] = [
  {
    id: "defi",
    title: "DeFi",
    items: [
      { name: "Uniswap", url: "https://app.uniswap.org/", domain: "uniswap.org", chains: ["Ethereum", "Base", "Arbitrum", "Optimism"], description: "DEX swaps, pools and token discovery." },
      { name: "PancakeSwap", url: "https://pancakeswap.finance/", domain: "pancakeswap.finance", chains: ["BNB", "Ethereum", "Base"], description: "DEX, farms and liquidity markets." },
      { name: "Jumper Exchange", url: "https://jumper.exchange/", domain: "jumper.exchange", chains: ["EVM", "Solana"], description: "Bridge and swap routing across chains." },
      { name: "1inch", url: "https://app.1inch.io/", domain: "1inch.io", chains: ["EVM"], description: "DEX aggregation and limit orders." },
      { name: "Rango", url: "https://app.rango.exchange/", domain: "rango.exchange", chains: ["EVM", "Solana", "Tron"], description: "Cross-chain route discovery." },
      { name: "Raydium", url: "https://raydium.io/", domain: "raydium.io", chains: ["Solana"], description: "AMM and liquidity pool on Solana." },
      { name: "Jupiter", url: "https://jup.ag/", domain: "jup.ag", chains: ["Solana"], description: "Best swap aggregator on Solana." },
      { name: "SunSwap", url: "https://sunswap.com/", domain: "sunswap.com", chains: ["Tron"], description: "Tron's largest decentralized exchange." },
      { name: "SunPump", url: "https://sunpump.meme/", domain: "sunpump.meme", chains: ["Tron"], description: "First meme coin platform on Tron." },
      { name: "Aave", url: "https://app.aave.com/", domain: "aave.com", chains: ["Ethereum", "Base", "Arbitrum"], description: "Lending and borrowing markets." },
      { name: "Curve", url: "https://curve.fi/", domain: "curve.fi", chains: ["Ethereum", "Arbitrum", "Base"], description: "Stablecoin and blue-chip liquidity." },
      { name: "STON.fi", url: "https://ston.fi/", domain: "ston.fi", chains: ["TON"], description: "Zero-Trust Cross-Chain DEX on TON." },
      { name: "DeDust", url: "https://dedust.io/", domain: "dedust.io", chains: ["TON"], description: "Advanced decentralized exchange on TON." },
    ],
  },
  {
    id: "prediction",
    title: "Prediction",
    items: [
      { name: "Polymarket", url: "https://polymarket.com/", domain: "polymarket.com", chains: ["Polygon"], description: "Prediction markets and event trading." },
      { name: "Limitless", url: "https://limitless.exchange/", domain: "limitless.exchange", chains: ["Base"], description: "Prediction markets on Base." },
      { name: "Azuro", url: "https://azuro.org/", domain: "azuro.org", chains: ["EVM"], description: "Prediction and gaming liquidity protocol." },
      { name: "SX Bet", url: "https://sx.bet/", domain: "sx.bet", chains: ["EVM"], description: "Sports and prediction market app." },
      { name: "PoolTogether", url: "https://pooltogether.com/", domain: "pooltogether.com", chains: ["EVM"], description: "Prize savings protocol." },
    ],
  },
  {
    id: "social",
    title: "Social",
    items: [
      { name: "Hooked", url: "https://hooked.io/", domain: "hooked.io", chains: ["BNB"], description: "Web3 education and social learning." },
      { name: "Vibely", url: "https://vibely.io/", domain: "vibely.io", chains: ["EVM"], description: "Community social layer." },
      { name: "The Arena", url: "https://arena.social/", domain: "arena.social", chains: ["Avalanche"], description: "Creator and community social app." },
      { name: "Lingo", url: "https://lingocoin.io/", domain: "lingocoin.io", chains: ["EVM"], description: "Consumer rewards and community app." },
      { name: "Farcaster", url: "https://warpcast.com/", domain: "warpcast.com", chains: ["Base"], description: "Onchain social network." },
    ],
  },
  {
    id: "nft",
    title: "NFTs",
    items: [
      { name: "OpenSea", url: "https://opensea.io/", domain: "opensea.io", chains: ["Ethereum", "Polygon", "Base"], description: "NFT marketplace and collections." },
      { name: "Magic Eden", url: "https://magiceden.io/", domain: "magiceden.io", chains: ["Solana", "Bitcoin", "EVM"], description: "NFT marketplace across major chains." },
      { name: "Tensor", url: "https://www.tensor.trade/", domain: "tensor.trade", chains: ["Solana"], description: "Solana NFT marketplace." },
      { name: "APENFT", url: "https://apenft.io/", domain: "apenft.io", chains: ["Tron"], description: "Premier NFT marketplace on Tron." },
      { name: "Zora", url: "https://zora.co/", domain: "zora.co", chains: ["Base", "Zora"], description: "Creator collectibles and mints." },
      { name: "Getgems", url: "https://getgems.io/", domain: "getgems.io", chains: ["TON"], description: "The largest NFT marketplace on TON." },
      { name: "Fragment", url: "https://fragment.com/", domain: "fragment.com", chains: ["TON"], description: "Buy and sell Telegram usernames and numbers." },
    ],
  },
  {
    id: "games",
    title: "Games & Social (TON)",
    items: [
      { name: "Catizen", url: "https://catizen.ai/", domain: "catizen.ai", chains: ["TON"], description: "Play-to-earn Web3 social game on TON." },
      { name: "TapSwap", url: "https://tapswap.io/", domain: "tapswap.io", chains: ["TON", "Solana"], description: "Fastest growing clicker game." },
      { name: "Notcoin", url: "https://notco.in/", domain: "notco.in", chains: ["TON"], description: "Probably nothing." },
    ],
  },
];

export function DappDirectory() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const normalized = query.trim().toLowerCase();

  const categories = useMemo(() => DAPP_CATEGORIES.map((category) => {
    const items = category.items.filter((item) =>
      !normalized
      || item.name.toLowerCase().includes(normalized)
      || item.domain.toLowerCase().includes(normalized)
      || item.chains.some((chain) => chain.toLowerCase().includes(normalized)),
    );
    return { ...category, items };
  }).filter((category) => category.items.length), [normalized]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="app-surface rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="section-kicker">dApps</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Discover apps and connect Acorus
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Open trusted DeFi, prediction, social and NFT apps. Acorus injects EVM, Solana and Tron providers where the app supports them, so wallet connection stays client-side.
            </p>
          </div>
          <label className="relative block w-full max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-500">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="bg-white/90 pl-10 text-slate-950 placeholder:text-slate-400"
              placeholder="Search dApps, chains, categories..."
            />
          </label>
        </div>
      </div>

      {categories.map((category) => {
        const isExpanded = Boolean(expanded[category.id]) || normalized.length > 0;
        const visibleItems = isExpanded ? category.items : category.items.slice(0, 6);

        return (
          <section key={category.id} className="premium-card bg-white/90 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-950">{category.title}</h2>
                <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-sm font-semibold text-fuchsia-700">
                  {category.items.length} dApps
                </span>
              </div>
              {category.items.length > 6 && !normalized ? (
                <button
                  type="button"
                  className="font-semibold text-fuchsia-600 hover:text-fuchsia-700"
                  onClick={() => setExpanded((current) => ({ ...current, [category.id]: !current[category.id] }))}
                >
                  {isExpanded ? "Show less" : "See more"}
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <a
                  key={`${category.id}-${item.name}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-3xl border border-fuchsia-100 bg-white p-4 shadow-[0_16px_50px_rgba(168,85,247,0.10)] transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:shadow-[0_22px_70px_rgba(168,85,247,0.16)] block"
                >
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.domain)}&sz=96`}
                      alt=""
                      className="h-12 w-12 rounded-2xl bg-fuchsia-50 p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="truncate text-lg font-semibold text-slate-950">{item.name}</h3>
                        <span className="text-slate-400 transition group-hover:text-fuchsia-600">↗</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.domain}</p>
                    </div>
                  </div>
                  <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{item.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.chains.slice(0, 4).map((chain) => (
                      <span key={chain} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        {chain}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-sky-400 px-4 py-2 text-center text-sm font-semibold text-white">
                    Open in Browser
                  </div>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
