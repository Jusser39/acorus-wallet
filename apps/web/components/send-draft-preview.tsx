import type { SendDraft } from "@acorus/shared";
import {
  AssetTypeBadge,
  ChainFamilyBadge,
} from "@/components/universal-badges";

export function SendDraftPreview(props: {
  draft: SendDraft | null;
}) {
  const draft = props.draft;

  if (!draft) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <ChainFamilyBadge family={draft.family} />
        <AssetTypeBadge type={draft.asset.type} />

        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
          {draft.supportStatus}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <div className="text-slate-500">Asset</div>
          <div className="font-medium text-slate-950">
            {draft.asset.symbol} · {draft.amountFormatted}
          </div>
        </div>

        <div>
          <div className="text-slate-500">To</div>
          <div className="break-all font-mono text-xs text-slate-700">
            {draft.normalizedToAddress ?? draft.toAddress}
          </div>
        </div>

        {draft.feeEstimate ? (
          <div>
            <div className="text-slate-500">Estimated fee</div>
            <div className="font-medium text-slate-950">
              {draft.feeEstimate.feeFormatted ?? "Unavailable"}{" "}
              {draft.feeEstimate.feeAsset.symbol}
            </div>

            <div className="text-xs text-slate-500">
              Source: {draft.feeEstimate.source}
            </div>
          </div>
        ) : null}
      </div>

      {draft.warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {draft.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      {draft.errors.length ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {draft.errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 text-xs text-slate-500">
        canProceed: {draft.canProceed ? "yes" : "no"} · canBroadcast:{" "}
        {draft.canBroadcast ? "yes" : "no"}
      </div>
    </div>
  );
}
