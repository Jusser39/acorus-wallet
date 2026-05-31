"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { getChainById, getUniversalChainsByFamily, type ChainId } from "@acorus/shared";
import { useActiveProfile, useWalletStore } from "@/store/wallet-store";
import { getPracticeAddress } from "@/lib/practice";
import { getUniversalReceiveInfo } from "@/lib/receive";
import { getExtensionReceiveAddress } from "@/lib/extension-bridge";
import { formatAddress } from "@/lib/utils";

export default function ReceivePage() {
  const activeProfile = useActiveProfile();
  const selectedChainId = useWalletStore((state) => state.selectedChainId);
  const setSelectedChainId = useWalletStore((state) => state.setSelectedChainId);
  const [copied, setCopied] = useState(false);
  const [extensionAddress, setExtensionAddress] = useState<string | null>(null);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  const availableChains = useMemo(
    () => (activeProfile ? getUniversalChainsByFamily(activeProfile.chainFamily) : []),
    [activeProfile],
  );
  const chain = useMemo(
    () => (
      typeof selectedChainId === "number"
        ? getChainById(selectedChainId) ?? availableChains[0] ?? null
        : availableChains.find((item) => String(item.chainId) === String(selectedChainId)) ?? availableChains[0] ?? null
    ),
    [availableChains, selectedChainId],
  );

  useEffect(() => {
    if (!activeProfile || !chain) {
      return;
    }

    let active = true;
    setExtensionError(null);

    void getExtensionReceiveAddress({
      family: activeProfile.chainFamily,
      chainId: chain.chainId,
    })
      .then((result) => {
        if (!active) return;
        setExtensionAddress(result?.address ?? null);
      })
      .catch((error) => {
        if (!active) return;
        setExtensionAddress(null);
        setExtensionError(
          error instanceof Error
            ? error.message
            : "Extension receive address is unavailable.",
        );
      });

    return () => {
      active = false;
    };
  }, [activeProfile, chain]);

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
    extensionAddress
      ? extensionAddress
      : activeProfile.type === "practice"
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
            onChange={(event) => setSelectedChainId(parseChainId(event.target.value))}
          >
            {availableChains.map((item) => (
              <option key={String(item.chainId)} value={String(item.chainId)}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-3xl border border-fuchsia-100 bg-white/82 p-5 shadow-[0_18px_42px_rgba(126,34,206,0.08)]">
          <p className="text-sm font-semibold text-slate-600">Address</p>
          <p className="mt-3 break-all text-lg font-semibold text-slate-950">{address}</p>
          <p className="mt-2 text-sm text-slate-500">{formatAddress(address)}</p>
          {extensionAddress ? (
            <p className="mt-3 text-sm text-emerald-300">
              Address served by Acorus Extension vault.
            </p>
          ) : null}
        </div>

        {extensionError ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            {extensionError}
          </div>
        ) : null}

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
        <QRCodeSVG key={address} value={address} size={220} bgColor="transparent" fgColor="#111827" />
        <p className="text-center text-sm text-slate-300">
          Receive on {chain?.name ?? "selected chain"} · {activeProfile.type.replace("_", " ")}
        </p>
      </aside>
    </section>
  );
}

function parseChainId(value: string): ChainId {
  const numeric = Number(value);
  return Number.isFinite(numeric) && value.trim() !== "" ? numeric : value;
}
