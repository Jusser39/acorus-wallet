"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ChainFamilyBadge } from "@/components/universal-badges";
import { useActiveProfile } from "@/store/wallet-store";
import { createDefaultAdapterRegistry } from "@acorus/wallet-core";
import {
  filterNfts,
  getNftActionLabel,
  getNftsForFamily,
  summarizeNfts,
  type NftCollectible,
  type NftFilter,
} from "@/lib/nft";

const filters: Array<{ id: NftFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "verified", label: "Verified" },
  { id: "sendable", label: "Sendable" },
  { id: "spam", label: "Spam" },
];

export default function NftPage() {
  const activeProfile = useActiveProfile();
  const [filter, setFilter] = useState<NftFilter>("all");
  const [selected, setSelected] = useState<NftCollectible | null>(null);
  const [liveItems, setLiveItems] = useState<NftCollectible[] | null>(null);

  const fallbackItems = useMemo(
    () => getNftsForFamily(activeProfile?.chainFamily),
    [activeProfile?.chainFamily],
  );

  useEffect(() => {
    if (!activeProfile) {
      setLiveItems(null);
      return;
    }
    
    const registry = createDefaultAdapterRegistry();
    const adapter = registry.list().find(a => a.family === activeProfile.chainFamily && a.capabilities.nft && a.getNfts);

    if (adapter && adapter.getNfts) {
      adapter.getNfts({ address: activeProfile.publicAddress }).then((nfts) => {
          const mapped: NftCollectible[] = nfts.map(n => ({
            id: n.id,
            family: adapter.family,
            chainId: adapter.chainId,
            chainName: adapter.name,
            standard: "erc721",
            contractAddress: n.contractAddress,
            tokenId: n.tokenId,
            name: n.name,
            collection: n.collectionName,
            description: "Live NFT fetched via adapter provider.",
            mediaTone: "from-slate-800 via-slate-700 to-slate-900", // Fallback tone
            imageUrl: n.imageUrl, // We need to support rendering imageUrl
            floorPriceLabel: null,
            lastTransferLabel: null,
            rarityLabel: null,
            isSpam: false,
            isVerified: true,
            sendStatus: "preview",
            burnStatus: "preview",
            explorerUrl: adapter.buildExplorerAddressUrl ? adapter.buildExplorerAddressUrl(n.contractAddress) : "#",
          }));
          setLiveItems(mapped);
        }).catch(err => {
          console.error("Failed to fetch live NFTs:", err);
          setLiveItems(null);
        });
        return;
    }
    setLiveItems(null);
  }, [activeProfile]);

  const allItems = useMemo(() => liveItems ?? fallbackItems, [liveItems, fallbackItems]);
  const items = useMemo(() => filterNfts(allItems, filter), [allItems, filter]);
  const summary = useMemo(() => summarizeNfts(allItems), [allItems]);
  const isUnsupportedFamily =
    activeProfile?.chainFamily === "tron"
    || activeProfile?.chainFamily === "utxo"
    || activeProfile?.chainFamily === "ton";

  return (
    <section className="page space-y-6">
      <div className="glass-panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Collectibles</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">NFT Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              View, stage sends, stage burns and inspect collectibles across EVM and Solana.
              Live provider sync can plug into this model without exposing seed or passcode.
            </p>
          </div>
          {activeProfile ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
              {activeProfile.name} · <ChainFamilyBadge family={activeProfile.chainFamily} />
            </div>
          ) : (
            <Link href="/" className="button-primary">Create wallet</Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Collectibles" value={summary.total} />
        <SummaryCard label="Verified" value={summary.verified} tone="emerald" />
        <SummaryCard label="Preview actions" value={summary.previewOnly} tone="sky" />
        <SummaryCard label="Spam flagged" value={summary.spam} tone="rose" />
      </div>

      {isUnsupportedFamily ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          NFT indexing for {activeProfile?.chainFamily.toUpperCase()} is not enabled yet. Receive/view-only
          support remains active, while collectibles stay hidden until a provider is connected.
        </div>
      ) : null}

      <div className="panel flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm ${
                filter === item.id
                  ? "bg-emerald-400 text-slate-950"
                  : "border border-slate-700 text-slate-300"
              }`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-400">
          {items.length} shown
        </div>
      </div>

      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((nft) => (
            <NftCard key={nft.id} nft={nft} onSelect={() => setSelected(nft)} />
          ))}
        </div>
      ) : (
        <div className="panel space-y-3 text-sm text-slate-300">
          <h2 className="text-xl font-semibold text-white">No collectibles in this view</h2>
          <p>
            Switch filters or open another profile. EVM and Solana previews are ready;
            live indexing is the next provider step.
          </p>
        </div>
      )}

      {selected ? (
        <div className="panel grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className={`min-h-64 rounded-3xl bg-gradient-to-br ${selected.mediaTone} overflow-hidden flex items-center justify-center relative`}>
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt={selected.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">{selected.collection}</p>
              <h2 className="mt-1 text-2xl font-semibold">{selected.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{selected.description}</p>
            </div>
            <dl className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <Detail label="Network" value={selected.chainName} />
              <Detail label="Standard" value={selected.standard.toUpperCase()} />
              <Detail label="Token ID" value={selected.tokenId} />
              <Detail label="Floor" value={selected.floorPriceLabel ?? "Unavailable"} />
              <Detail label="Rarity" value={selected.rarityLabel ?? "Unknown"} />
              <Detail label="Last transfer" value={selected.lastTransferLabel ?? "Unknown"} />
            </dl>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="button-primary" disabled={selected.sendStatus === "disabled"}>
                {getNftActionLabel(selected.sendStatus, "send")}
              </button>
              <button type="button" className="button-secondary" disabled={selected.burnStatus === "disabled"}>
                {getNftActionLabel(selected.burnStatus, "burn")}
              </button>
              <a href={selected.explorerUrl} target="_blank" rel="noreferrer" className="button-secondary">
                Explorer
              </a>
              <button type="button" className="button-secondary" onClick={() => setSelected(null)}>
                Close details
              </button>
            </div>
            <div className="warning-box text-sm">
              NFT send and burn are staged as explicit review actions. Real execution will require
              unlocked local vault, recipient validation, fee estimate and final confirmation.
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard(props: { label: string; value: number; tone?: "emerald" | "sky" | "rose" }) {
  const tone =
    props.tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
      : props.tone === "sky"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
        : props.tone === "emerald"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-slate-800 bg-slate-900/80 text-slate-100";

  return (
    <div className={`rounded-3xl border p-5 ${tone}`}>
      <p className="text-sm opacity-80">{props.label}</p>
      <p className="mt-2 text-3xl font-semibold">{props.value}</p>
    </div>
  );
}

function NftCard({ nft, onSelect }: { nft: NftCollectible; onSelect: () => void }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        <div className={`h-48 w-full bg-gradient-to-br ${nft.mediaTone} relative overflow-hidden`}>
           {nft.imageUrl ? (
             <img src={nft.imageUrl} alt={nft.name} className="absolute inset-0 w-full h-full object-cover" />
           ) : null}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{nft.name}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{nft.collection}</p>
            </div>
            <ChainFamilyBadge family={nft.family} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={nft.standard.toUpperCase()} />
            {nft.isVerified ? <Badge label="Verified" tone="emerald" /> : <Badge label="Unverified" />}
            {nft.isSpam ? <Badge label="Spam" tone="rose" /> : null}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <Detail label="Floor" value={nft.floorPriceLabel ?? "N/A"} compact />
            <Detail label="Rarity" value={nft.rarityLabel ?? "N/A"} compact />
          </div>
        </div>
      </button>
    </article>
  );
}

function Badge({ label, tone }: { label: string; tone?: "emerald" | "rose" }) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
        : "border-slate-700 bg-slate-800 text-slate-300";

  return <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>{label}</span>;
}

function Detail({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "rounded-2xl border border-slate-800 bg-slate-950/40 p-3"}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-all text-sm text-slate-200">{value}</dd>
    </div>
  );
}
