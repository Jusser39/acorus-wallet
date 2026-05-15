"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WalletProfileRecord } from "@acorus/shared";
import type { PortfolioSummaryView } from "@/lib/portfolio";
import type { UniversalPortfolioView } from "@/lib/universal-assets";
import { createUniversalSendDraft } from "@/lib/send-draft";
import { buildSendAssetOptions } from "@/lib/send-assets";
import { buildSendNetworkOptions, findSendNetworkOption } from "@/lib/send-networks";
import {
  canNetworkBroadcast,
  getSendStatusLabel,
  type SendComposerState,
} from "@/lib/send-ui";
import { SendDraftPreview } from "@/components/send-draft-preview";
import {
  AssetTypeBadge,
  ChainFamilyBadge,
  SkeletonBadge,
} from "@/components/universal-badges";

type Props = {
  profile: WalletProfileRecord;
  portfolio: PortfolioSummaryView | UniversalPortfolioView | null;
  initialFamily?: string;
  initialChainId?: number | string;
  /** When EVM draft is ready and canProceed, show a bridge link to the EVM send form */
  evmSendHref?: string;
};

export function SendComposer(props: Props) {
  const networkOptions = useMemo(() => buildSendNetworkOptions(), []);

  const initialNetwork = useMemo(() => {
    if (props.initialFamily && props.initialChainId) {
      const found = findSendNetworkOption({
        family: props.initialFamily as any,
        chainId: props.initialChainId,
      });
      if (found) return found;
    }
    return (
      networkOptions.find((n) => n.family === props.profile.chainFamily) ??
      networkOptions[0]!
    );
  }, [networkOptions, props.initialFamily, props.initialChainId, props.profile.chainFamily]);

  const [state, setState] = useState<SendComposerState>({
    step: "compose",
    family: initialNetwork.family,
    chainId: initialNetwork.chainId,
    assetOptionId: "",
    toAddress: "",
    amountFormatted: "",
    draft: null,
    error: null,
  });

  const selectedNetwork =
    findSendNetworkOption({ family: state.family, chainId: state.chainId }) ??
    initialNetwork;

  const assetOptions = useMemo(
    () =>
      buildSendAssetOptions({
        profile: props.profile,
        network: selectedNetwork,
        portfolio: props.portfolio,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.profile, props.portfolio, selectedNetwork.id],
  );

  const selectedAsset =
    assetOptions.find((a) => a.id === state.assetOptionId) ??
    assetOptions[0] ??
    null;

  // Auto-select first asset when network changes
  useEffect(() => {
    if (!selectedAsset) return;
    setState((current) => {
      if (current.assetOptionId === selectedAsset.id) return current;
      return { ...current, assetOptionId: selectedAsset.id };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNetwork.id]);

  function handleNetworkChange(networkId: string) {
    const next = networkOptions.find((n) => n.id === networkId);
    if (!next) return;
    setState((current) => ({
      ...current,
      step: "compose",
      family: next.family,
      chainId: next.chainId,
      assetOptionId: "",
      draft: null,
      error: null,
    }));
  }

  async function handleCreateDraft() {
    if (!selectedAsset) {
      setState((current) => ({ ...current, step: "error", error: "Select an asset first." }));
      return;
    }

    setState((current) => ({ ...current, draft: null, error: null }));

    try {
      const draft = await createUniversalSendDraft({
        family: selectedNetwork.family,
        chainId: selectedNetwork.chainId,
        fromAddress: props.profile.publicAddress,
        toAddress: state.toAddress,
        asset: selectedAsset.asset,
        amountFormatted: state.amountFormatted,
        balance: selectedAsset.balance ?? null,
      });

      setState((current) => ({
        ...current,
        draft,
        step: draft.canProceed ? "draft" : "unsupported",
        error: null,
      }));
    } catch (err) {
      setState((current) => ({
        ...current,
        step: "error",
        error: err instanceof Error ? err.message : "Failed to create send draft.",
      }));
    }
  }

  const canCreateDraft =
    Boolean(selectedAsset) &&
    state.toAddress.trim().length > 0 &&
    state.amountFormatted.trim().length > 0;

  const sendStatusLabel = getSendStatusLabel(selectedNetwork.sendStatus);
  const canBroadcast = canNetworkBroadcast(selectedNetwork.sendStatus);
  const showEvmBridge =
    canBroadcast &&
    state.draft?.canProceed &&
    Boolean(props.evmSendHref);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      {/* Compose panel */}
      <div className="panel space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
            Universal send composer
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Send {selectedNetwork.nativeSymbol || selectedNetwork.label}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Select a network and asset, enter recipient and amount. The wallet
            validates a send draft before any real transaction is created.
          </p>
        </div>

        {/* Network + asset selectors */}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Network</span>
            <select
              value={selectedNetwork.id}
              onChange={(e) => handleNetworkChange(e.target.value)}
            >
              {networkOptions.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} · {getSendStatusLabel(n.sendStatus)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Asset</span>
            <select
              value={selectedAsset?.id ?? ""}
              onChange={(e) =>
                setState((current) => ({
                  ...current,
                  assetOptionId: e.target.value,
                  draft: null,
                  error: null,
                  step: "compose",
                }))
              }
            >
              {assetOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset.symbol}
                  {a.balanceFormatted ? ` · ${a.balanceFormatted}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <ChainFamilyBadge family={selectedNetwork.family} />
          {selectedNetwork.isSkeleton ? <SkeletonBadge /> : null}
          {selectedAsset ? <AssetTypeBadge type={selectedAsset.asset.type} /> : null}
          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs font-semibold text-slate-400">
            {sendStatusLabel}
          </span>
        </div>

        {/* Non-EVM warning */}
        {!canBroadcast ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
            This network supports draft validation but real send broadcast is not
            enabled yet. You can preview the draft — no funds will move.
          </div>
        ) : null}

        {/* Recipient */}
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">Recipient address</span>
          <input
            type="text"
            value={state.toAddress}
            onChange={(e) =>
              setState((current) => ({
                ...current,
                toAddress: e.target.value,
                draft: null,
                error: null,
                step: "compose",
              }))
            }
            placeholder={
              selectedNetwork.family === "evm"
                ? "0x..."
                : selectedNetwork.family === "solana"
                  ? "Solana public key..."
                  : selectedNetwork.family === "tron"
                    ? "T..."
                    : "Recipient address..."
            }
          />
        </label>

        {/* Amount */}
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-300">
            Amount ({selectedAsset?.asset.symbol ?? "—"})
          </span>
          <input
            type="number"
            min="0"
            step="any"
            value={state.amountFormatted}
            onChange={(e) =>
              setState((current) => ({
                ...current,
                amountFormatted: e.target.value,
                draft: null,
                error: null,
                step: "compose",
              }))
            }
            placeholder="0.0"
          />
          {selectedAsset?.balanceFormatted ? (
            <p className="text-xs text-slate-500">
              Available: {selectedAsset.balanceFormatted} {selectedAsset.asset.symbol}
            </p>
          ) : null}
        </label>

        {/* Error */}
        {state.error ? (
          <p className="text-sm text-rose-400">{state.error}</p>
        ) : null}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="button-primary"
            disabled={!canCreateDraft}
            onClick={() => void handleCreateDraft()}
          >
            Preview draft
          </button>
          <Link href="/wallet" className="button-secondary">
            Back to wallet
          </Link>
        </div>

        {/* EVM bridge to legacy send */}
        {showEvmBridge ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <p className="font-medium">Draft validated — EVM send available</p>
            <p className="mt-1 text-emerald-300">
              Your draft looks good. Use the EVM send form below to submit the
              real transaction.
            </p>
            <a
              href={props.evmSendHref}
              className="mt-3 inline-flex items-center gap-1 text-emerald-300 underline underline-offset-4"
            >
              Go to EVM send form ↓
            </a>
          </div>
        ) : null}
      </div>

      {/* Preview panel */}
      <aside className="space-y-5">
        <div className="panel space-y-4">
          <h3 className="text-lg font-semibold">Draft preview</h3>

          {!state.draft && state.step === "compose" ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-400">
              Fill in the form and click <strong>Preview draft</strong> to see
              the validation result.
            </div>
          ) : null}

          <SendDraftPreview draft={state.draft} />

          {state.step === "unsupported" && state.draft ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
              <p className="font-medium">Send not available</p>
              <p className="mt-1">
                Status:{" "}
                <span className="font-mono">{state.draft.supportStatus}</span>.
                This network adapter does not support broadcast yet.
              </p>
            </div>
          ) : null}

          {state.step === "draft" && state.draft?.canProceed && !canBroadcast ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-400">
              Draft is valid but this network is coming soon. No transaction will
              be submitted.
            </div>
          ) : null}
        </div>

        <div className="panel space-y-3 text-xs text-slate-500">
          <p className="font-medium text-slate-400">What is a send draft?</p>
          <p>
            A send draft validates your inputs — address format, amount, balance
            — without creating or broadcasting any transaction. No funds move
            until you confirm in the EVM send form.
          </p>
          <p>
            Non-EVM adapters (Solana, Tron, Bitcoin) are in the roadmap.
            Broadcast support will be enabled per network as each adapter is
            implemented and audited.
          </p>
        </div>
      </aside>
    </div>
  );
}
