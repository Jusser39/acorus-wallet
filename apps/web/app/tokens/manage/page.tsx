"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getChainsByFamily, getCuratedTokens, normalizeAddressForChain } from "@acorus/shared";
import {
  deleteUserToken,
  hideUserToken,
  listUserTokens,
  unhideUserToken,
  type UserToken,
} from "@/lib/api";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";

type FilterMode = "all" | "visible" | "hidden" | "custom";

type ManageTokenRow = {
  id?: string;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  isHidden: boolean;
  isCustom: boolean;
  isVerified: boolean;
  sourceStatus?: string | null;
  riskLevel?: string | null;
};

function tokenKey(chainId: number, tokenAddress: string): string {
  return `${chainId}:${normalizeAddressForChain(chainId, tokenAddress)}`;
}

function buildRows(chainId: number, userTokens: UserToken[]): ManageTokenRow[] {
  const rows = new Map<string, ManageTokenRow>();
  const chainUserTokens = userTokens.filter((token) => token.chainId === chainId);

  for (const token of getCuratedTokens(chainId)) {
    const key = tokenKey(chainId, token.address);
    const override = chainUserTokens.find(
      (item) => tokenKey(chainId, item.tokenAddress) === tokenKey(chainId, token.address),
    );

    rows.set(key, {
      id: override?.id,
      chainId,
      tokenAddress: token.address,
      symbol: override?.symbol ?? token.symbol,
      name: override?.name ?? token.name,
      decimals: override?.decimals ?? token.decimals,
      isHidden: override?.isHidden ?? false,
      isCustom: false,
      isVerified: true,
      sourceStatus: override?.sourceStatus ?? null,
      riskLevel: override?.riskLevel ?? null,
    });
  }

  for (const token of chainUserTokens.filter((item) => item.isCustom)) {
    rows.set(tokenKey(chainId, token.tokenAddress), {
      id: token.id,
      chainId,
      tokenAddress: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      isHidden: token.isHidden,
      isCustom: true,
      isVerified: token.isVerified,
      sourceStatus: token.sourceStatus ?? null,
      riskLevel: token.riskLevel ?? null,
    });
  }

  return [...rows.values()].sort((left, right) => {
    if (left.isHidden !== right.isHidden) {
      return left.isHidden ? 1 : -1;
    }
    if (left.isCustom !== right.isCustom) {
      return left.isCustom ? -1 : 1;
    }
    return left.symbol.localeCompare(right.symbol);
  });
}

export default function ManageTokensPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const evmSelectedChainId =
    typeof selectedChainId === "number"
    && getChainsByFamily("evm").some((chain) => chain.chainId === selectedChainId)
      ? selectedChainId
      : 1;

  const [userTokens, setUserTokens] = useState<UserToken[]>([]);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableChains = useMemo(
    () => (activeProfile ? getChainsByFamily(activeProfile.chainFamily) : []),
    [activeProfile],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!userId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tokens = await listUserTokens({
          userId,
          walletProfileId: activeProfile?.id,
        });
        if (active) {
          setUserTokens(tokens);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load tokens.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [activeProfile?.id, userId]);

  const rows = useMemo(
    () => buildRows(evmSelectedChainId, userTokens),
    [evmSelectedChainId, userTokens],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (filterMode === "visible" && row.isHidden) {
        return false;
      }
      if (filterMode === "hidden" && !row.isHidden) {
        return false;
      }
      if (filterMode === "custom" && !row.isCustom) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        row.symbol,
        row.name,
        row.tokenAddress,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [filterMode, query, rows]);

  async function refreshTokens() {
    if (!userId) {
      return;
    }

    const tokens = await listUserTokens({
      userId,
      walletProfileId: activeProfile?.id,
    });
    setUserTokens(tokens);
  }

  async function handleVisibilityToggle(row: ManageTokenRow) {
    if (!userId || !activeProfile) {
      return;
    }

    setBusyKey(tokenKey(row.chainId, row.tokenAddress));
    setError(null);

    try {
      if (row.isHidden) {
        await unhideUserToken({
          userId,
          chainId: row.chainId,
          tokenAddress: row.tokenAddress,
        });
      } else {
        await hideUserToken({
          userId,
          walletProfileId: activeProfile.id,
          chainId: row.chainId,
          tokenAddress: row.tokenAddress,
          symbol: row.symbol,
          name: row.name,
          decimals: row.decimals,
          isCustom: row.isCustom,
        });
      }

      await refreshTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update token visibility.");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDelete(row: ManageTokenRow) {
    if (!row.isCustom || !row.id) {
      return;
    }

    setBusyKey(tokenKey(row.chainId, row.tokenAddress));
    setError(null);

    try {
      await deleteUserToken(row.id);
      await refreshTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete token.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!activeProfile || !userId) {
    return (
      <section className="page">
        <div className="panel space-y-3">
          <p className="text-sm text-slate-400">No active wallet. Unlock or create a wallet first.</p>
          <Link href="/" className="button-primary inline-flex">Go home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-sm text-slate-400 hover:text-white">← Wallet</Link>
        <span className="text-slate-600">/</span>
        <span className="text-sm text-slate-300">Manage tokens</span>
      </div>

      <div className="panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Manage tokens</h1>
            <p className="mt-2 text-sm text-slate-400">
              {activeProfile.chainFamily === "solana"
                ? "Hide or unhide curated SPL tokens for this Solana profile."
                : "Hide curated tokens, unhide hidden ones, and remove custom tokens from this wallet."}
            </p>
          </div>
          {activeProfile.chainFamily === "evm" ? (
            <Link href="/tokens/add" className="button-secondary inline-flex items-center justify-center">
              Add custom token
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-[180px_180px_1fr]">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Chain</span>
            <select
              value={evmSelectedChainId}
              onChange={(event) => setSelectedChainId(Number(event.target.value))}
            >
              {availableChains.map((chain) => (
                <option key={chain.chainId} value={chain.chainId}>{chain.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Filter</span>
            <select value={filterMode} onChange={(event) => setFilterMode(event.target.value as FilterMode)}>
              <option value="all">All tokens</option>
              <option value="visible">Visible only</option>
              <option value="hidden">Hidden only</option>
              <option value="custom">Custom only</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-300">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by symbol, name, or address"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Visible</p>
            <p className="mt-1 text-2xl font-semibold">{rows.filter((row) => !row.isHidden).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Hidden</p>
            <p className="mt-1 text-2xl font-semibold">{rows.filter((row) => row.isHidden).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
            <p className="text-xs text-slate-400">Custom</p>
            <p className="mt-1 text-2xl font-semibold">{rows.filter((row) => row.isCustom).length}</p>
          </div>
        </div>
      </div>

      <div className="panel space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-800/40" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-slate-400">No tokens match the current filters.</p>
        ) : (
          filteredRows.map((row) => {
            const rowKey = tokenKey(row.chainId, row.tokenAddress);
            const isBusy = busyKey === rowKey;

            return (
              <div
                key={rowKey}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{row.symbol}</p>
                      <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] text-slate-300">
                        {row.isCustom ? "Custom" : "Curated"}
                      </span>
                      {row.isHidden ? (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                          Hidden
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
                          Visible
                        </span>
                      )}
                      {row.riskLevel && row.riskLevel !== "unknown" ? (
                        <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] text-slate-300">
                          {row.riskLevel}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{row.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{row.tokenAddress}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tokens/${row.chainId}/${row.tokenAddress}`}
                      className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-400 hover:text-white"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleVisibilityToggle(row)}
                      className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-400 hover:text-white disabled:opacity-60"
                    >
                      {isBusy ? "Saving…" : row.isHidden ? "Unhide" : "Hide"}
                    </button>
                    {row.isCustom ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDelete(row)}
                        className="rounded-full border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 transition hover:border-rose-400 hover:text-rose-100 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
