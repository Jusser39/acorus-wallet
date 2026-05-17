import type { SwapQuote } from "@acorus/shared";
import { AssetTypeBadge, ChainFamilyBadge, SourceBadge } from "./universal-badges";

export function SwapRoutePreview(props: {
  quote: SwapQuote | null;
}) {
  const quote = props.quote;

  if (!quote) return null;

  return (
    <div className="app-surface space-y-5 rounded-[2rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-white">Route preview</h2>
        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">
          {quote.status}
        </span>
        <SourceBadge provider={quote.provider} sourceStatus="quote" />
      </div>

      <div className="grid gap-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="text-sm text-slate-400">You pay</div>
          <div className="text-2xl font-semibold text-white">
            {quote.fromAmountFormatted} {quote.from.symbol}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="text-sm text-slate-400">You receive estimated</div>
          <div className="text-2xl font-semibold text-white">
            {quote.toAmountFormatted ?? "—"} {quote.to.symbol}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-slate-300">
          <div>Slippage: {(quote.slippageBps / 100).toFixed(2)}%</div>
          <div>
            Minimum received: {quote.minimumReceivedFormatted ?? "—"} {quote.to.symbol}
          </div>
          <div>
            Price impact:{" "}
            {quote.priceImpactBps != null
              ? `${(quote.priceImpactBps / 100).toFixed(2)}%`
              : "—"}
          </div>
          <div>
            Expires:{" "}
            {quote.expiresAt
              ? new Date(quote.expiresAt).toLocaleTimeString()
              : "—"}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-white">Route</h3>

        {quote.route.map((step, index) => (
          <div
            key={`${step.provider}-${index}`}
            className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4 text-sm"
          >
            <div className="flex flex-wrap gap-2">
              <ChainFamilyBadge family={step.family} />
              <AssetTypeBadge type={step.fromAsset.type} />
              <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs text-slate-300">
                {step.protocolName ?? step.provider}
              </span>
            </div>

            <div className="mt-3 text-slate-300">
              {step.fromAsset.symbol} → {step.toAsset.symbol}
            </div>
          </div>
        ))}
      </div>

      {quote.warnings.length ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          {quote.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      {quote.errors.length ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {quote.errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
