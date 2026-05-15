"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { getChainById, getChainsByFamily } from "@acorus/shared";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { getPracticeAddress } from "@/lib/practice";
import { getUniversalReceiveInfo } from "@/lib/receive";
import { formatAddress } from "@/lib/utils";

export default function ReceivePage() {
  const activeProfile = useActiveProfile();
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const [copied, setCopied] = useState(false);

  const availableChains = useMemo(
    () => (activeProfile ? getChainsByFamily(activeProfile.chainFamily) : []),
    [activeProfile],
  );
  const chain = useMemo(
    () => getChainById(selectedChainId) ?? availableChains[0] ?? null,
    [availableChains, selectedChainId],
  );

  if (!activeProfile) {
    return (
      <section className="page">
        <div className="panel space-y-3">
          <h1 className="text-2xl font-semibold">Нет активного кошелька</h1>
          <p className="text-sm text-slate-300">
            Сначала создайте, импортируйте или выберите существующий профиль.
          </p>
          <Link href="/" className="button-primary inline-flex">
            Go to onboarding
          </Link>
        </div>
      </section>
    );
  }

  const address =
    activeProfile.type === "practice"
      ? getPracticeAddress(activeProfile.chainFamily)
      : activeProfile.publicAddress;
  const receiveInfo =
    activeProfile.type === "practice"
      ? null
      : getUniversalReceiveInfo({
          family: activeProfile.chainFamily,
          chainId: selectedChainId,
          address,
        });

  async function handleCopy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="page grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Receive</h1>
          <p className="mt-2 text-sm text-slate-300">
            {receiveInfo?.warning
              ?? "Используйте только совместимые активы и адрес текущего активного профиля."}
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Selected chain</span>
          <select
            value={selectedChainId}
            onChange={(event) => setSelectedChainId(Number(event.target.value))}
          >
            {availableChains.map((item) => (
              <option key={item.chainId} value={item.chainId}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Address</p>
          <p className="mt-3 break-all text-lg font-medium">{address}</p>
          <p className="mt-2 text-sm text-slate-400">{formatAddress(address)}</p>
        </div>

        <div className="warning-box text-sm">
          {receiveInfo?.warning
            ?? <>Отправляйте только активы сети <strong>{chain?.name ?? "selected chain"}</strong>. Активы из другой сети могут быть потеряны.</>}
        </div>

        <button type="button" className="button-primary" onClick={() => void handleCopy()}>
          {copied ? "Copied" : "Copy address"}
        </button>
        {receiveInfo?.explorerUrl ? (
          <a
            href={receiveInfo.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-emerald-300"
          >
            Open in explorer
          </a>
        ) : null}
      </div>

      <aside className="panel flex flex-col items-center justify-center gap-4">
        <QRCodeSVG value={address} size={220} bgColor="transparent" fgColor="#ffffff" />
        <p className="text-center text-sm text-slate-300">
          Receive on {chain?.name ?? "selected chain"} · {activeProfile.type.replace("_", " ")}
        </p>
      </aside>
    </section>
  );
}
