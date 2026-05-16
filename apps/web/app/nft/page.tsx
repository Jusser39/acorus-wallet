const MOCK_EVM_NFTS = [
  {
    id: "1",
    name: "Acorus Genesis #001",
    collection: "Acorus Genesis",
    chain: "ETH",
    gradient: "from-violet-600 via-purple-500 to-indigo-600",
  },
  {
    id: "2",
    name: "Acorus Genesis #042",
    collection: "Acorus Genesis",
    chain: "ETH",
    gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
  },
  {
    id: "3",
    name: "Emerald Shard #007",
    collection: "Emerald Shards",
    chain: "BASE",
    gradient: "from-emerald-500 via-teal-400 to-cyan-500",
  },
  {
    id: "4",
    name: "Neon Drift #128",
    collection: "Neon Drift",
    chain: "MATIC",
    gradient: "from-amber-400 via-orange-500 to-red-500",
  },
];

const CHAIN_BADGE: Record<string, string> = {
  ETH: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  BASE: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  MATIC: "border-violet-500/40 bg-violet-500/10 text-violet-300",
};

export default function NftPage() {
  return (
    <section className="page space-y-8">
      {/* Header */}
      <div className="glass-panel space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Collectibles</p>
        <h1 className="text-3xl font-semibold text-white">NFTs</h1>
        <p className="text-sm text-slate-300">
          View, send and manage your NFT collectibles across EVM chains and Solana.
        </p>
      </div>

      {/* EVM NFTs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-white">EVM NFTs</h2>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-200">
            Coming soon
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_EVM_NFTS.map((nft) => (
            <div
              key={nft.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-[0_18px_48px_rgba(2,6,23,0.18)]"
            >
              {/* Gradient image placeholder */}
              <div className={`h-40 w-full bg-gradient-to-br ${nft.gradient}`} />
              <div className="p-3 space-y-1">
                <p className="text-sm font-semibold text-white truncate">{nft.name}</p>
                <p className="text-xs text-slate-400 truncate">{nft.collection}</p>
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${CHAIN_BADGE[nft.chain] ?? "border-slate-700 text-slate-300"}`}
                >
                  {nft.chain}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          NFT detection via OpenSea / Reservoir API — live data in next wave.
        </p>
      </div>

      {/* Solana NFTs */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-3 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Solana NFTs</h2>
          <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-400">
            Planned
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Solana NFT support is planned for a future wave, including Metaplex and cNFT (compressed NFT) collections.
        </p>
      </div>

      {/* Send note */}
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
        <p className="text-sm text-sky-300">
          💡 For NFT sends, use the universal <strong>Send → NFT</strong> flow (coming in next wave).
        </p>
      </div>
    </section>
  );
}
