import type { AssetType, ChainFamily } from "@acorus/shared";
import { getAssetTypeLabel, getChainFamilyLabel } from "@/lib/universal-assets";

const familyColors: Record<ChainFamily, string> = {
  evm: "border-sky-500/30 bg-sky-500/20 text-sky-300",
  solana: "border-violet-500/30 bg-violet-500/20 text-violet-300",
  tron: "border-red-500/30 bg-red-500/20 text-red-300",
  utxo: "border-amber-500/30 bg-amber-500/20 text-amber-300",
  ton: "border-blue-500/30 bg-blue-500/20 text-blue-300",
};

const assetTypeColors: Record<string, string> = {
  native: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
  erc20: "border-sky-500/30 bg-sky-500/20 text-sky-200",
  spl: "border-violet-500/30 bg-violet-500/20 text-violet-200",
  trc20: "border-red-500/30 bg-red-500/20 text-red-200",
  utxo: "border-amber-500/30 bg-amber-500/20 text-amber-200",
  jetton: "border-blue-500/30 bg-blue-500/20 text-blue-200",
  practice: "border-slate-600 bg-slate-700/60 text-slate-300",
};

export function ChainFamilyBadge({ family }: { family: ChainFamily }) {
  const cls = familyColors[family] ?? "border-slate-600 bg-slate-700/60 text-slate-300";
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {getChainFamilyLabel(family)}
    </span>
  );
}

export function AssetTypeBadge({ type }: { type: AssetType | "practice" }) {
  const cls = assetTypeColors[type] ?? "border-slate-600 bg-slate-700/60 text-slate-300";
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] ${cls}`}>
      {type === "practice" ? "Practice" : getAssetTypeLabel(type)}
    </span>
  );
}

export function SkeletonBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
      {label ?? "Skeleton"}
    </span>
  );
}
