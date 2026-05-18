"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssetBalance } from "@acorus/shared";
import { getSwapQuote } from "@/lib/api";
import { requestExtensionSwap } from "@/lib/extension-bridge";
import { buildSendNetworkOptions } from "@/lib/send-networks";
import { buildSwapAssetOptions } from "@/lib/swap-assets";
import { isCrossChainSwap, type SwapComposerState } from "@/lib/swap-ui";
import { SwapRoutePreview } from "./swap-route-preview";
import { ChainFamilyBadge, SkeletonBadge } from "./universal-badges";

export function SwapComposer(props: {
  portfolioAssets?: AssetBalance[];
  userAddress?: string | null;
}) {
  const networks = useMemo(() => buildSendNetworkOptions(), []);
  const initialFrom = networks[0]!;
  const initialTo =
    networks.find(
      (network) =>
        network.family === "evm" &&
        String(network.chainId) !== String(initialFrom.chainId),
    ) ?? networks[1] ?? networks[0]!;

  const [state, setState] = useState<SwapComposerState>({
    step: "compose",
    fromFamily: initialFrom.family,
    fromChainId: initialFrom.chainId,
    fromAssetOptionId: "",
    toFamily: initialTo.family,
    toChainId: initialTo.chainId,
    toAssetOptionId: "",
    amountFormatted: "",
    slippageBps: 50,
    quote: null,
    error: null,
  });
  const [quoting, setQuoting] = useState(false);
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);
  const [extensionResult, setExtensionResult] = useState<string | null>(null);

  const fromNetwork =
    networks.find(
      (item) =>
        item.family === state.fromFamily &&
        String(item.chainId) === String(state.fromChainId),
    ) ?? initialFrom;
  const toNetwork =
    networks.find(
      (item) =>
        item.family === state.toFamily &&
        String(item.chainId) === String(state.toChainId),
    ) ?? initialTo;

  const fromAssets = useMemo(
    () =>
      buildSwapAssetOptions({
        portfolioAssets: props.portfolioAssets,
        family: fromNetwork.family,
        chainId: fromNetwork.chainId,
      }),
    [props.portfolioAssets, fromNetwork.family, fromNetwork.chainId],
  );

  const toAssets = useMemo(
    () =>
      buildSwapAssetOptions({
        portfolioAssets: props.portfolioAssets,
        family: toNetwork.family,
        chainId: toNetwork.chainId,
      }),
    [props.portfolioAssets, toNetwork.family, toNetwork.chainId],
  );

  const selectedFromAsset =
    fromAssets.find((asset) => asset.id === state.fromAssetOptionId) ??
    fromAssets[0] ??
    null;
  const selectedToAsset =
    toAssets.find((asset) => asset.id === state.toAssetOptionId) ??
    toAssets[0] ??
    null;

  useEffect(() => {
    if (!selectedFromAsset) return;
    setState((current) =>
      current.fromAssetOptionId === selectedFromAsset.id
        ? current
        : { ...current, fromAssetOptionId: selectedFromAsset.id },
    );
  }, [selectedFromAsset]);

  useEffect(() => {
    if (!selectedToAsset) return;
    setState((current) =>
      current.toAssetOptionId === selectedToAsset.id
        ? current
        : { ...current, toAssetOptionId: selectedToAsset.id },
    );
  }, [selectedToAsset]);

  function updateFromNetwork(networkId: string) {
    const network = networks.find((item) => item.id === networkId);
    if (!network) return;

    setState((current) => ({
      ...current,
      fromFamily: network.family,
      fromChainId: network.chainId,
      fromAssetOptionId: "",
      quote: null,
      error: null,
      step: "compose",
    }));
  }

  function updateToNetwork(networkId: string) {
    const network = networks.find((item) => item.id === networkId);
    if (!network) return;

    setState((current) => ({
      ...current,
      toFamily: network.family,
      toChainId: network.chainId,
      toAssetOptionId: "",
      quote: null,
      error: null,
      step: "compose",
    }));
  }

  async function handleQuote() {
    if (!selectedFromAsset || !selectedToAsset) {
      setState((current) => ({
        ...current,
        error: "Select assets first.",
        step: "error",
      }));
      return;
    }

    setQuoting(true);
    setState((current) => ({
      ...current,
      error: null,
      quote: null,
    }));

    try {
      const quote = await getSwapQuote({
        from: selectedFromAsset.asset,
        to: selectedToAsset.asset,
        amountFormatted: state.amountFormatted,
        slippageBps: state.slippageBps,
        slippageMode: "custom",
        userAddress: props.userAddress ?? null,
      });

      setState((current) => ({
        ...current,
        quote,
        step: quote.status === "quoted" ? "quote" : "unsupported",
        error: quote.errors[0] ?? null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : "Failed to get swap quote.",
        step: "error",
      }));
    } finally {
      setQuoting(false);
    }
  }

  async function handleRequestExtensionSwap() {
    if (!state.quote || !selectedFromAsset || !selectedToAsset) {
      return;
    }

    setExtensionSubmitting(true);
    setExtensionResult(null);

    try {
      await requestExtensionSwap({
        from: selectedFromAsset.asset,
        to: selectedToAsset.asset,
        amountFormatted: state.amountFormatted,
        slippageBps: state.slippageBps,
        quote: state.quote,
        userAddress: props.userAddress ?? null,
      });
      setExtensionResult("Swap request approved in extension preview queue.");
    } catch (error) {
      setExtensionResult(
        error instanceof Error ? error.message : "Extension swap request failed.",
      );
    } finally {
      setExtensionSubmitting(false);
    }
  }

  const canQuote =
    Boolean(selectedFromAsset) &&
    Boolean(selectedToAsset) &&
    Boolean(state.amountFormatted.trim());

  const crossChain = isCrossChainSwap({
    fromFamily: fromNetwork.family,
    fromChainId: fromNetwork.chainId,
    toFamily: toNetwork.family,
    toChainId: toNetwork.chainId,
  });

  function selectFromAsset(optionId: string) {
    setState((current) => ({
      ...current,
      fromAssetOptionId: optionId,
      quote: null,
      error: null,
      step: "compose",
    }));
  }

  function selectToAsset(optionId: string) {
    setState((current) => ({
      ...current,
      toAssetOptionId: optionId,
      quote: null,
      error: null,
      step: "compose",
    }));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,640px)_minmax(320px,1fr)] xl:justify-center">
      <div className="light-card space-y-5 rounded-[2rem] p-4 sm:p-5">
        <div className="px-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="section-kicker !border-slate-900/10 !bg-white/75 !text-slate-700">
                Universal swap
              </span>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                Multichain quote
              </h1>
            </div>
            <span className="rounded-full border border-slate-900/8 bg-white/72 px-3 py-1 text-xs font-semibold text-slate-700">
              Step · {state.step}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Build routes across EVM, Solana, Tron and planned chains from one
            composer. Execution remains disabled while providers and signing
            flows are safety-reviewed.
          </p>
        </div>

        <div className="mx-1 rounded-[1.5rem] border border-fuchsia-300/30 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-900">
          Quote preview only. No approvals, signatures or broadcasts happen here.
        </div>

        <div className="grid gap-2 rounded-[1.6rem] bg-white/60 p-2 md:grid-cols-2">
          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">
              From network
            </span>
            <select
              className="light-field"
              value={fromNetwork.id}
              onChange={(event) => updateFromNetwork(event.target.value)}
            >
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">
              To network
            </span>
            <select
              className="light-field"
              value={toNetwork.id}
              onChange={(event) => updateToNetwork(event.target.value)}
            >
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-2">
          <ChainFamilyBadge family={fromNetwork.family} />
          <span className="text-sm text-slate-400">→</span>
          <ChainFamilyBadge family={toNetwork.family} />
          {fromNetwork.isSkeleton || toNetwork.isSkeleton ? <SkeletonBadge /> : null}
          {crossChain ? (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-300">
              Cross-chain preview
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              Same-chain preview
            </span>
          )}
        </div>

        <div className="grid gap-2 rounded-[1.6rem] bg-white/60 p-2 md:grid-cols-2">
          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">
              From asset
            </span>
            <select
              className="light-field"
              value={selectedFromAsset?.id ?? ""}
              onChange={(event) => selectFromAsset(event.target.value)}
            >
              {fromAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                  {asset.balanceFormatted ? ` · ${asset.balanceFormatted}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">
              To asset
            </span>
            <select
              className="light-field"
              value={selectedToAsset?.id ?? ""}
              onChange={(event) => selectToAsset(event.target.value)}
            >
              {toAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 md:col-span-2">
            <span className="px-2 text-sm font-medium text-slate-600">Quick pick</span>
            <div className="token-quick-grid">
              {fromAssets.slice(0, 6).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="token-quick-button"
                  data-selected={asset.id === selectedFromAsset?.id}
                  onClick={() => selectFromAsset(asset.id)}
                >
                  <span className="token-quick-button__orb">
                    {asset.asset.symbol.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-left text-sm font-semibold">
                      {asset.asset.symbol}
                    </span>
                    <span className="block truncate text-left text-xs text-slate-500">
                      {asset.balanceFormatted ?? asset.chainLabel}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <span className="px-2 text-sm font-medium text-slate-600">Receive quick pick</span>
            <div className="token-quick-grid">
              {toAssets.slice(0, 6).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="token-quick-button"
                  data-selected={asset.id === selectedToAsset?.id}
                  onClick={() => selectToAsset(asset.id)}
                >
                  <span className="token-quick-button__orb">
                    {asset.asset.symbol.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-left text-sm font-semibold">
                      {asset.asset.symbol}
                    </span>
                    <span className="block truncate text-left text-xs text-slate-500">
                      {asset.balanceFormatted ?? asset.chainLabel}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-[1.6rem] bg-white/60 p-2 md:grid-cols-[1fr_180px]">
          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">Amount</span>
            <input
              className="light-field"
              inputMode="decimal"
              placeholder="0.00"
              value={state.amountFormatted}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  amountFormatted: event.target.value,
                  quote: null,
                  error: null,
                  step: "compose",
                }))
              }
            />
          </label>

          <label className="space-y-2">
            <span className="px-2 text-sm font-medium text-slate-600">
              Slippage %
            </span>
            <input
              className="light-field"
              inputMode="decimal"
              value={(state.slippageBps / 100).toString()}
              onChange={(event) => {
                const value = Number(event.target.value);
                setState((current) => ({
                  ...current,
                  slippageBps: Number.isFinite(value)
                    ? Math.max(1, Math.round(value * 100))
                    : 50,
                  quote: null,
                  error: null,
                }));
              }}
            />
          </label>
        </div>

        {state.error ? (
          <div className="mx-1 rounded-[1.5rem] border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}

        <div className="grid gap-3 px-1 pb-1 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            className="button-primary w-full"
            disabled={!canQuote || quoting}
            onClick={() => void handleQuote()}
          >
            {quoting ? "Loading quote…" : "Get quote"}
          </button>

          <button
            type="button"
            className="button-secondary"
            disabled={!state.quote || extensionSubmitting}
            onClick={() => void handleRequestExtensionSwap()}
          >
            {extensionSubmitting ? "Opening extension..." : "Swap with extension"}
          </button>
        </div>

        {extensionResult ? (
          <div className="mx-1 rounded-[1.5rem] border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-100">
            {extensionResult}
          </div>
        ) : null}
      </div>

      <aside className="space-y-6">
        <SwapRoutePreview quote={state.quote} />

        {!state.quote ? (
          <div className="premium-card space-y-3 p-5">
            <h2 className="text-xl font-semibold text-white">
              Quote only
            </h2>
            <p className="text-sm text-slate-300">
              This shell prepares the universal swap UX and quote architecture.
              Real provider execution will be added in separate safety-reviewed
              waves.
            </p>
          </div>
        ) : null}

        {state.quote ? (
          <div className="premium-card space-y-3 p-5">
            <h2 className="text-xl font-semibold text-white">
              Extension execution gate
            </h2>
            <p className="text-sm text-slate-300">
              The website can now send the prepared route to Acorus Extension
              for approval. Broadcast remains gated per network adapter.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
