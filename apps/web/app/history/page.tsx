"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChainById } from "@acorus/shared";
import { listTransactions, updateTransactionStatus } from "@/lib/api";
import { getExplorerTxUrl, formatAddress } from "@/lib/utils";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { StatusBadge } from "@/components/status-badge";
import { GlassCard } from "@/components/glass-card";
import type { TransactionRecordItem } from "@acorus/shared";

export default function HistoryPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const [items, setItems] = useState<TransactionRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSkeletonChainFamily =
    activeProfile?.chainFamily === "tron"
    || activeProfile?.chainFamily === "utxo"
    || activeProfile?.chainFamily === "ton";
  const isSolana = activeProfile?.chainFamily === "solana";
  const isNonEvmHistory = isSolana || isSkeletonChainFamily;

  useEffect(() => {
    if (!activeProfile || !userId) {
      return;
    }

    let active = true;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listTransactions(userId, activeProfile.id);

        if (!active) {
          return;
        }

        setItems(response);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Не удалось загрузить историю.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [activeProfile, userId]);

  async function handleRefreshStatuses() {
    if (!userId || isNonEvmHistory) {
      return;
    }

    setLoading(true);
    const refreshed = await Promise.all(
      items.map((item) =>
        item.status === "pending" || item.status === "unknown"
          ? updateTransactionStatus(item.id, userId).catch(() => item)
          : Promise.resolve(item),
      ),
    );

    setItems(refreshed);
    setLoading(false);
  }

  async function handleRefreshSingle(item: TransactionRecordItem) {
    const chain = getChainById(item.chainId);

    if (!userId || item.assetType === "practice" || chain?.family !== "evm") {
      return;
    }

    const next = await updateTransactionStatus(item.id, userId).catch(() => item);
    setItems((current) => current.map((entry) => (entry.id === item.id ? next : entry)));
  }

  return (
    <section className="page space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Transaction history</h1>
          <p className="mt-2 text-sm text-slate-300">
            {isSkeletonChainFamily
              ? `${activeProfile?.chainFamily ?? "This chain"} history is not implemented yet. Send transactions are not available.`
              : isSolana
                ? "Solana history is read-only in this wave. Existing records remain visible, but status refresh is intentionally disabled."
                : "История хранится как публичные tx records без seed/private key."}
          </p>
        </div>
        {!isNonEvmHistory ? (
          <button type="button" className="button-primary" onClick={() => void handleRefreshStatuses()}>
            Refresh pending
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading history...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4">
        {items.length ? (
          items.map((item) => {
            const chain = getChainById(item.chainId);
            const canRefresh = item.assetType !== "practice" && chain?.family === "evm" && !item.hash.startsWith("swap_");

            let isSwap = false;
            let swapData: any = null;
            if (item.rawStatus) {
              try {
                const parsed = JSON.parse(item.rawStatus);
                if (parsed && parsed.type === "swap") {
                  isSwap = true;
                  swapData = parsed;
                }
              } catch (e) {}
            }

            return (
              <GlassCard key={item.id} className="p-4 space-y-3" glow={isSwap}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {isSwap ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 10v12"/><path d="M7 22l-4-4"/><path d="M15 22l4-4"/><path d="M21 6H3"/><path d="M3 6l4-4"/><path d="M21 6l-4-4"/></svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            Swap {swapData.sellAmount} {swapData.sellSymbol} → {swapData.buyAmount} {swapData.buySymbol}
                          </p>
                          <p className="text-sm text-slate-400">
                            via {swapData.routeLabel || swapData.provider || "Router"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ring-1 ${item.direction === "in" ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30" : "bg-slate-500/20 text-slate-300 ring-slate-500/30"}`}>
                          {item.direction === "in" ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {item.direction === "in" ? "Receive" : "Send"} {item.amount} {item.symbol}
                          </p>
                          <p className="text-sm text-slate-400">
                            {item.direction === "in" ? `From: ${formatAddress(item.from)}` : `To: ${formatAddress(item.to)}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="grid gap-2 text-sm text-slate-300 pl-10 border-t border-white/5 pt-3 mt-3">
                  <p>
                    Network: {chain?.name ?? item.chainId}
                  </p>
                  <p>Submitted: {new Date(item.submittedAt).toLocaleString("ru-RU")}</p>
                  {item.confirmedAt ? (
                    <p>Confirmed: {new Date(item.confirmedAt).toLocaleString("ru-RU")}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-4">
                    {item.hash && !item.hash.startsWith("swap_") ? <span>Hash: {formatAddress(item.hash)}</span> : null}
                    {item.explorerUrl ?? getExplorerTxUrl(item.chainId, item.hash) ? (
                      <Link
                        href={item.explorerUrl ?? getExplorerTxUrl(item.chainId, item.hash)!}
                        target="_blank"
                        className="text-emerald-300 hover:text-emerald-200 transition-colors"
                      >
                        Explorer
                      </Link>
                    ) : null}
                    {canRefresh ? (
                      <button
                        type="button"
                        className="text-emerald-300 hover:text-emerald-200 transition-colors"
                        onClick={() => void handleRefreshSingle(item)}
                      >
                        Refresh status
                      </button>
                    ) : null}
                  </div>
                  {item.rawStatus && !isSwap ? <p className="text-slate-400 text-xs">Raw status: {item.rawStatus}</p> : null}
                </div>
              </GlassCard>
            );
          })
        ) : (
          <div className="panel text-sm text-slate-400">
            {isSolana
              ? "Solana history is ready for future records, but this skeleton wave does not create real Solana transactions yet."
              : "Пока нет транзакций."}
          </div>
        )}
      </div>
    </section>
  );
}
