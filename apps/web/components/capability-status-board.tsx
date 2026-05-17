import {
  getChainCapabilityProfile,
  summarizeCapabilityProfile,
  type ChainFamily,
  type UniversalCapabilityStatus,
} from "@acorus/shared";

const families: ChainFamily[] = ["evm", "solana", "tron", "utxo", "ton"];

const statusTone: Record<UniversalCapabilityStatus, string> = {
  live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  preview: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  planned: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  blocked: "border-slate-700 bg-slate-800/70 text-slate-300",
};

export function CapabilityStatusBoard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {families.map((family) => {
        const profile = getChainCapabilityProfile({ family });
        const summary = summarizeCapabilityProfile(profile);

        return (
          <div key={family} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">{profile.nativeSymbol || "Network"}</p>
                <h2 className="mt-1 text-lg font-semibold">{profile.name}</h2>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs ${summary.live > 5 ? statusTone.live : statusTone.preview}`}>
                {summary.live > 5 ? "Live" : "Preview"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Live" value={summary.live} tone={statusTone.live} />
              <Metric label="Preview" value={summary.preview} tone={statusTone.preview} />
              <Metric label="Planned" value={summary.planned} tone={statusTone.planned} />
              <Metric label="Blocked" value={summary.blocked} tone={statusTone.blocked} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Metric(props: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${props.tone}`}>
      <p className="opacity-80">{props.label}</p>
      <p className="mt-1 text-base font-semibold">{props.value}</p>
    </div>
  );
}
