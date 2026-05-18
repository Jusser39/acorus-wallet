"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { deriveSolanaAccountFromMnemonic } from "@acorus/wallet-core";
import {
  getChainById,
  getDefaultChainIdForFamily,
  getUniversalChain,
  getUniversalChainsByFamily,
  getChainCapabilityProfile,
  summarizeCapabilityProfile,
  normalizeAddressForChain,
  type ChainId,
} from "@acorus/shared";
import {
  createWalletProfile,
  hideUserToken,
  updateWalletProfile,
  type FiatCurrency,
} from "@/lib/api";
import {
  loadUniversalPortfolioSummary,
  loadPortfolioSummary,
  type PortfolioAssetView,
  type PortfolioSummaryView,
} from "@/lib/portfolio";
import { getPracticeAddress, PRACTICE_LESSONS } from "@/lib/practice";
import { PortfolioSummaryCard } from "@/components/portfolio-summary-card";
import { AssetList } from "@/components/asset-list";
import { WalletActionGrid } from "@/components/wallet-action-grid";
import { WalletHealthCard } from "@/components/wallet-health-card";
import { formatAddress } from "@/lib/utils";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { getSendAvailability } from "@/lib/send-policy";
import { buildWalletHealthSummary } from "@/lib/wallet-health";

export default function WalletPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const profiles = useWalletStore((state) => state.profiles);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const setWalletError = useWalletStore((state) => state.setError);
  const lockWallet = useWalletStore((state) => state.lockWallet);

  const [portfolio, setPortfolio] = useState<PortfolioSummaryView | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [hiddenSaving, setHiddenSaving] = useState(false);
  const [busyTokenKey, setBusyTokenKey] = useState<string | null>(null);
  const [addingSolana, setAddingSolana] = useState(false);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string | null>(null);

  const hiddenBalance = activeProfile?.hiddenBalance ?? false;
  const isLocked = activeProfile?.type === "local" && !unlockedVault;
  const isViewOnly = activeProfile?.type === "view_only";
  const isEvm = activeProfile?.chainFamily === "evm";
  const isSolana = activeProfile?.chainFamily === "solana";
  const isSkeletonFamily =
    activeProfile?.chainFamily === "tron"
    || activeProfile?.chainFamily === "utxo"
    || activeProfile?.chainFamily === "ton";
  const currency: FiatCurrency = (activeProfile?.preferredCurrency as FiatCurrency) ?? "USD";
  const healthSummary = activeProfile
    ? buildWalletHealthSummary({
        profile: activeProfile,
        isUnlocked: Boolean(unlockedVault),
        safetyMode: useWalletStore.getState().safetyMode,
        hasEncryptedVault: Boolean(useWalletStore.getState().encryptedVault),
      })
    : null;
  const capabilityProfile = activeProfile
    ? getChainCapabilityProfile({
        family: activeProfile.chainFamily,
        chainId: selectedChainId,
      })
    : null;
  const capabilitySummary = capabilityProfile ? summarizeCapabilityProfile(capabilityProfile) : null;

  const sendAvailability = activeProfile
    ? getSendAvailability({
        profileType: activeProfile.type,
        chainFamily: activeProfile.chainFamily,
        isUnlocked: Boolean(unlockedVault),
        safetyMode: useWalletStore.getState().safetyMode,
      })
    : { canSend: false, ctaLabel: "Send unavailable" };

  const availableChains = useMemo(
    () => (activeProfile ? getUniversalChainsByFamily(activeProfile.chainFamily) : []),
    [activeProfile],
  );

  const chain = useMemo(
    () => (
      (typeof selectedChainId === "number" ? getChainById(selectedChainId) : undefined)
      ?? getUniversalChain({ chainId: selectedChainId })
      ?? availableChains[0]
      ?? getChainById(getDefaultChainIdForFamily("evm") as number)
    ),
    [availableChains, selectedChainId],
  );

  const hasSolanaLocalProfile = useMemo(
    () =>
      profiles.some(
        (profile) => profile.chainFamily === "solana" && profile.type === "local",
      ),
    [profiles],
  );

  const canCreateSolanaProfile = Boolean(
    activeProfile?.chainFamily === "evm"
      && activeProfile?.type === "local"
      && unlockedVault
      && !hasSolanaLocalProfile,
  );

  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      if (!activeProfile || !userId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let summary: PortfolioSummaryView;

        if (activeProfile.type === "practice") {
          summary = await loadPortfolioSummary(
            activeProfile,
            typeof selectedChainId === "number" ? selectedChainId : 1,
            userId,
            currency,
          );
        } else if (isSolana) {
          summary = await loadUniversalPortfolioSummary({
            userId,
            walletProfileId: activeProfile.id,
            family: "solana",
            chainId: 101,
            address: activeProfile.publicAddress,
            currency,
          });
        } else if (isSkeletonFamily) {
          throw new Error(`${activeProfile.chainFamily}_portfolio_not_implemented`);
        } else {
          summary = await loadPortfolioSummary(
            activeProfile,
            typeof selectedChainId === "number" ? selectedChainId : 101,
            userId,
            currency,
          );
        }

        if (active) {
          setPortfolio(summary);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load portfolio.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPortfolio();
    return () => {
      active = false;
    };
  }, [activeProfile, selectedChainId, userId, refreshNonce, currency, isSkeletonFamily, isSolana]);

  async function handleCopyAddress() {
    if (!activeProfile) {
      return;
    }

    const value =
      activeProfile.type === "practice"
        ? getPracticeAddress(activeProfile.chainFamily)
        : activeProfile.publicAddress;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleHiddenBalanceToggle() {
    if (!activeProfile || !userId) {
      return;
    }

    setHiddenSaving(true);
    setError(null);

    try {
      const next = await updateWalletProfile(activeProfile.id, {
        userId,
        hiddenBalance: !hiddenBalance,
      });
      upsertProfile(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update hidden balance.");
    } finally {
      setHiddenSaving(false);
    }
  }

  async function handleHideToken(asset: PortfolioAssetView) {
    if (!activeProfile || !userId || !asset.tokenAddress) {
      return;
    }

    setBusyTokenKey(
      `${asset.chainId}:${normalizeAddressForChain(asset.chainId, asset.tokenAddress)}`,
    );
    setError(null);

    try {
      await hideUserToken({
        userId,
        walletProfileId: activeProfile.id,
        chainId: typeof selectedChainId === "number" ? selectedChainId : 0,
        tokenAddress: asset.tokenAddress,
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        isCustom: asset.isCustom,
      });
      setRefreshNonce((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hide token.");
    } finally {
      setBusyTokenKey(null);
    }
  }

  async function handleAddSolanaProfile() {
    if (!userId || !unlockedVault) {
      setError("Unlock the local vault before adding a Solana profile.");
      return;
    }

    setAddingSolana(true);
    setError(null);

    try {
      const account = deriveSolanaAccountFromMnemonic({
        mnemonic: unlockedVault.mnemonic,
      });

      const existing = profiles.find(
        (profile) =>
          profile.chainFamily === "solana"
          && profile.type === "local"
          && profile.publicAddress === account.publicAddress,
      );

      if (existing) {
        setActiveProfileId(existing.id);
        return;
      }

      const profile = await createWalletProfile({
        userId,
        name: `${activeProfile?.name ?? "Wallet"} · Solana`,
        type: "local",
        publicAddress: account.publicAddress,
        chainFamily: "solana",
      });

      upsertProfile(profile);
      setActiveProfileId(profile.id);
      setWalletError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add a Solana profile.");
    } finally {
      setAddingSolana(false);
    }
  }

  if (!activeProfile) {
    return (
      <section className="page">
        <div className="premium-card space-y-3 p-5">
          <h1 className="text-2xl font-semibold">No active wallet</h1>
          <p className="text-sm text-slate-300">
            Create, import or add a view-only/practice wallet on the home page.
          </p>
          <Link href="/" className="button-primary inline-flex">
            Go to onboarding
          </Link>
        </div>
      </section>
    );
  }

  const walletAddress =
    activeProfile.type === "practice"
      ? getPracticeAddress(activeProfile.chainFamily)
      : activeProfile.publicAddress;
  const nativeBalance = portfolio?.assets.find((asset) => asset.type === "native")?.balanceFormatted ?? "0";
  const tokenAssets = portfolio?.assets.filter((asset) => asset.type !== "native") ?? [];
  const selectedAsset =
    tokenAssets.find((asset) =>
      selectedAssetKey === (
        asset.tokenAddress
          ? `${asset.chainId}:${normalizeAddressForChain(asset.chainId, asset.tokenAddress)}`
          : `native:${asset.chainId}:${asset.symbol.toUpperCase()}`
      ),
    ) ?? tokenAssets[0] ?? null;
  const selectedAssetDetailHref =
    selectedAsset && activeProfile.chainFamily === "evm" && selectedAsset.type === "erc20" && selectedAsset.tokenAddress
      ? `/tokens/${selectedAsset.chainId}/${selectedAsset.tokenAddress}`
      : null;

  useEffect(() => {
    if (!tokenAssets.length) {
      if (selectedAssetKey !== null) {
        setSelectedAssetKey(null);
      }
      return;
    }

    const keys = tokenAssets.map((asset) =>
      asset.tokenAddress
        ? `${asset.chainId}:${normalizeAddressForChain(asset.chainId, asset.tokenAddress)}`
        : `native:${asset.chainId}:${asset.symbol.toUpperCase()}`,
    );

    if (!selectedAssetKey || !keys.includes(selectedAssetKey)) {
      setSelectedAssetKey(keys[0] ?? null);
    }
  }, [selectedAssetKey, tokenAssets]);

  return (
    <section className="page grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-6">
        <div className="app-surface space-y-5 rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="section-kicker">
                {activeProfile.type.replace("_", " ")} · {activeProfile.chainFamily}
              </span>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{activeProfile.name}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {formatAddress(activeProfile.publicAddress)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="button-secondary" onClick={() => void handleCopyAddress()}>
                {copied ? "Copied" : "Copy address"}
              </button>
              <Link href="/receive" className="button-secondary">Receive</Link>
              <Link href="/swap" className="button-secondary">Swap quote</Link>
              {isViewOnly ? (
                <button type="button" className="button-primary opacity-60" disabled>
                  {sendAvailability.ctaLabel}
                </button>
              ) : (
                <Link href="/send" className="button-primary">
                  {isEvm ? "Send" : "Send draft"}
                </Link>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="data-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {isViewOnly ? "View only" : activeProfile.type === "practice" ? "Practice" : "Self-custody"}
              </p>
            </div>
            <div className="data-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Primary chain</p>
              <p className="mt-2 text-sm font-semibold text-white">{chain?.name ?? "Unknown chain"}</p>
            </div>
            <div className="data-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Send status</p>
              <p className="mt-2 text-sm font-semibold text-white">{sendAvailability.ctaLabel}</p>
            </div>
          </div>

          {activeProfile.type === "view_only" && (
            <div className="warning-box text-sm">View-only: sending disabled, no private key.</div>
          )}
          {activeProfile.type === "practice" && (
            <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-sky-100">
              Practice mode — no real funds used.
            </div>
          )}
            {isSolana && (
              <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-sm text-violet-100">
                Solana skeleton active: receive, portfolio, SPL balances and read-only history are enabled. Use <strong>Send draft</strong> to preview a send — real broadcast coming in the next wave.
              </div>
            )}
            {isSkeletonFamily && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                {activeProfile.chainFamily} adapter is skeleton-only in this wave. Use <strong>Send draft</strong> to preview — real broadcast not implemented yet.
              </div>
            )}
          {isLocked && (
            <div className="warning-box space-y-3 text-sm">
              <p>Wallet locked. Unlock to create derived profiles or access mnemonic-backed actions.</p>
              <Link href="/unlock" className="button-primary inline-flex">Unlock wallet</Link>
            </div>
          )}
          {canCreateSolanaProfile && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Add the Solana sibling profile derived from the same local mnemonic.</span>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={addingSolana}
                  onClick={() => void handleAddSolanaProfile()}
                >
                  {addingSolana ? "Adding…" : "Add Solana profile"}
                </button>
              </div>
            </div>
          )}

          <PortfolioSummaryCard
            summary={portfolio}
            loading={loading}
            hidden={hiddenBalance}
            currency={currency}
          />

          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Launchpad</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Actions
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                One wallet for sending, receiving, swapping, exploring and
                connecting later.
              </p>
            </div>

            <WalletActionGrid />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="premium-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm text-slate-400">Native balance · {chain?.name ?? `Chain ${selectedChainId}`}</p>
                <button
                  type="button"
                  className="text-sm text-fuchsia-200"
                  disabled={hiddenSaving}
                  onClick={() => void handleHiddenBalanceToggle()}
                >
                  {hiddenBalance ? "Show balance" : "Hide balance"}
                </button>
              </div>
              <p className="metric-emphasis mt-4 text-4xl font-semibold">
                {hiddenBalance ? "••••" : `${parseFloat(nativeBalance).toFixed(4)} ${chain?.nativeSymbol ?? ""}`}
              </p>
              <p className="mt-3 text-sm text-slate-400">Currency: {currency}</p>
            </div>
            <div className="premium-card flex flex-col items-center justify-center gap-3 p-5">
              <QRCodeSVG value={walletAddress} size={148} bgColor="transparent" fgColor="#ffffff" />
              <p className="text-center text-xs text-slate-300">
                {isSolana ? "Receive only on Solana-compatible routes." : "Only send assets on the selected network."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 space-y-2">
              <span className="text-sm text-slate-300">Chain</span>
              <select
                value={selectedChainId}
                onChange={(event) => setSelectedChainId(parseChainId(event.target.value))}
              >
                {availableChains.map((item) => (
                  <option key={String(item.chainId)} value={String(item.chainId)}>{item.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button-secondary"
              disabled={loading}
              onClick={() => setRefreshNonce((value) => value + 1)}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="premium-card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assets</h2>
            <div className="flex items-center gap-3">
              {!isSolana ? <Link href="/tokens/add" className="text-sm text-fuchsia-200">+ Add token</Link> : null}
              <Link href="/tokens/manage" className="text-sm text-fuchsia-200">Manage</Link>
              <Link href="/history" className="text-sm text-fuchsia-200">History</Link>
            </div>
          </div>
          {selectedAsset ? (
            <div className="asset-spotlight">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="token-orb flex h-14 w-14 shrink-0 items-center justify-center text-sm font-black">
                    {selectedAsset.symbol.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Selected asset
                    </p>
                    <h3 className="mt-2 truncate text-xl font-semibold text-white">
                      {selectedAsset.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedAsset.symbol} · {selectedAsset.balanceFormatted}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">24h move</p>
                  <p className={`mt-2 text-lg font-semibold ${
                    (selectedAsset.change24hPercent ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}>
                    {selectedAsset.change24hPercent == null ? "—" : `${selectedAsset.change24hPercent >= 0 ? "+" : ""}${selectedAsset.change24hPercent.toFixed(2)}%`}
                  </p>
                  {!hiddenBalance && selectedAsset.fiatValue != null ? (
                    <p className="mt-1 text-sm text-slate-400">
                      {new Intl.NumberFormat(
                        currency === "RUB" ? "ru-RU" : currency === "EUR" ? "de-DE" : "en-US",
                        { style: "currency", currency, maximumFractionDigits: 2 },
                      ).format(selectedAsset.fiatValue)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/send" className="button-primary inline-flex !px-4 !py-2.5 !text-sm">
                  Send
                </Link>
                <Link href="/receive" className="button-secondary inline-flex !px-4 !py-2.5 !text-sm">
                  Receive
                </Link>
                {selectedAssetDetailHref ? (
                  <Link href={selectedAssetDetailHref} className="button-secondary inline-flex !px-4 !py-2.5 !text-sm">
                    View details
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
          <AssetList
            assets={tokenAssets}
            hidden={hiddenBalance}
            currency={currency}
            chainId={typeof selectedChainId === "number" ? selectedChainId : 0}
            chainFamily={activeProfile?.chainFamily}
            loading={loading}
            onHideToken={(asset) => void handleHideToken(asset)}
            busyTokenKey={busyTokenKey}
            selectedAssetKey={selectedAssetKey}
            onSelectAsset={(asset) =>
              setSelectedAssetKey(
                asset.tokenAddress
                  ? `${asset.chainId}:${normalizeAddressForChain(asset.chainId, asset.tokenAddress)}`
                  : `native:${asset.chainId}:${asset.symbol.toUpperCase()}`,
              )
            }
          />
        </div>
      </div>

      <aside className="space-y-6">
        {healthSummary ? <WalletHealthCard summary={healthSummary} /> : null}

        {capabilityProfile && capabilitySummary ? (
          <div className="premium-card space-y-4 p-5">
            <div>
              <p className="text-sm text-slate-400">Multichain capabilities</p>
              <h2 className="text-xl font-semibold">{capabilityProfile.name}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <CapabilityMetric label="Live" value={capabilitySummary.live} tone="text-emerald-300" />
              <CapabilityMetric label="Preview" value={capabilitySummary.preview} tone="text-sky-300" />
              <CapabilityMetric label="Planned" value={capabilitySummary.planned} tone="text-amber-300" />
              <CapabilityMetric label="Blocked" value={capabilitySummary.blocked} tone="text-slate-400" />
            </div>
          </div>
        ) : null}

        <div className="premium-card space-y-4 p-5">
          <h2 className="text-xl font-semibold">Quick actions</h2>
          <div className="grid gap-3">
            <Link href="/receive" className="button-secondary text-center">Receive assets</Link>
            <Link href="/swap" className="button-secondary text-center">Swap quote</Link>
            {isViewOnly || !isEvm ? (
              <div className="button-primary text-center opacity-60">{sendAvailability.ctaLabel}</div>
            ) : (
              <Link href="/send" className="button-primary text-center">Send assets</Link>
            )}
            <Link href="/history" className="button-secondary text-center">Open history</Link>
            <Link href="/contacts" className="button-secondary text-center">Manage contacts</Link>
            {!isSolana ? (
              <Link href="/tokens/add" className="button-secondary text-center">Add custom token</Link>
            ) : null}
            <Link href="/tokens/manage" className="button-secondary text-center">Manage tokens</Link>
            <Link href="/settings" className="button-secondary text-center">Settings</Link>
            <button type="button" className="button-secondary text-center" onClick={() => lockWallet()}>
              Lock wallet
            </button>
          </div>
        </div>

        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold">Practice lessons</h2>
          <div className="space-y-3 text-sm text-slate-300">
            {PRACTICE_LESSONS.slice(0, 3).map((lesson) => (
              <div key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="font-medium text-white">{lesson.title}</p>
                <p className="mt-2">{lesson.description}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

function parseChainId(value: string): ChainId {
  const numeric = Number(value);
  return Number.isFinite(numeric) && value.trim() !== "" ? numeric : value;
}

function CapabilityMetric(props: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-500">{props.label}</p>
      <p className={`mt-1 text-lg font-semibold ${props.tone}`}>{props.value}</p>
    </div>
  );
}
