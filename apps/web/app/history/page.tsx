"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EVM_CHAINS } from "@acorus/shared";
import { listTransactions, updateTransactionStatus } from "@/lib/api";
import { getExplorerTxUrl, formatAddress } from "@/lib/utils";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { StatusBadge } from "@/components/status-badge";
import type { TransactionRecordItem } from "@acorus/shared";

export default function HistoryPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const [items, setItems] = useState<TransactionRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!userId) {
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
    if (!userId || item.assetType === "practice") {
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
            История хранится как публичные tx records без seed/private key.
          </p>
        </div>
        <button type="button" className="button-primary" onClick={() => void handleRefreshStatuses()}>
          Refresh pending
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading history...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="panel space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.direction.toUpperCase()} · {item.symbol} · {item.amount}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatAddress(item.from)} → {formatAddress(item.to)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <p>
                  Network: {EVM_CHAINS.find((chain) => chain.chainId === item.chainId)?.name ?? item.chainId}
                </p>
                <p>Submitted: {new Date(item.submittedAt).toLocaleString("ru-RU")}</p>
                {item.confirmedAt ? (
                  <p>Confirmed: {new Date(item.confirmedAt).toLocaleString("ru-RU")}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-4">
                  <span>Hash: {formatAddress(item.hash)}</span>
                  {item.explorerUrl ?? getExplorerTxUrl(item.chainId, item.hash) ? (
                    <Link
                      href={item.explorerUrl ?? getExplorerTxUrl(item.chainId, item.hash)!}
                      target="_blank"
                      className="text-emerald-300"
                    >
                      Explorer
                    </Link>
                  ) : null}
                  {item.assetType !== "practice" ? (
                    <button
                      type="button"
                      className="text-emerald-300"
                      onClick={() => void handleRefreshSingle(item)}
                    >
                      Refresh status
                    </button>
                  ) : null}
                </div>
                {item.rawStatus ? <p className="text-slate-400">Raw status: {item.rawStatus}</p> : null}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {item.assetType}
              </div>
            </div>
          ))
        ) : (
          <div className="panel text-sm text-slate-400">Пока нет транзакций.</div>
        )}
      </div>
    </section>
  );
}
