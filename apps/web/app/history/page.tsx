"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTransactions, refreshTransactionStatus } from "@/lib/api";
import { getExplorerTxUrl } from "@/lib/utils";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { StatusBadge } from "@/components/status-badge";
import type { TransactionRecordItem } from "@acorus/shared";

export default function HistoryPage() {
  const activeProfile = useActiveProfile();
  const userId = useWalletStore((state) => state.userId);
  const [items, setItems] = useState<TransactionRecordItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfile || !userId) {
      return;
    }

    let active = true;

    void (async () => {
      setLoading(true);
      const response = await fetchTransactions(userId, activeProfile.id);

      if (!active) {
        return;
      }

      setItems(response);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [activeProfile, userId]);

  async function handleRefreshStatuses() {
    if (!userId) {
      return;
    }

    const refreshed = await Promise.all(
      items.map((item) => refreshTransactionStatus(item.id, userId).catch(() => item)),
    );

    setItems(refreshed);
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
          Refresh statuses
        </button>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading history...</p> : null}

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
                    {item.from} → {item.to}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <span>Hash: {item.hash}</span>
                {getExplorerTxUrl(item.chainId, item.hash) ? (
                  <Link
                    href={getExplorerTxUrl(item.chainId, item.hash)!}
                    target="_blank"
                    className="text-emerald-300"
                  >
                    Explorer
                  </Link>
                ) : null}
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
