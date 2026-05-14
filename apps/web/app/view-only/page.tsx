"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWalletProfile } from "@/lib/api";
import { useWalletStore } from "@/store/wallet-store";

export default function ViewOnlyPage() {
  const router = useRouter();
  const userId = useWalletStore((state) => state.userId);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const [walletName, setWalletName] = useState("View-only wallet");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!userId || !address) {
      setError("Нужен пользовательский контекст и публичный адрес.");
      return;
    }

    const profile = await createWalletProfile({
      userId,
      name: walletName,
      type: "view_only",
      publicAddress: address,
      chainFamily: "evm",
    });

    upsertProfile(profile);
    setActiveProfileId(profile.id);
    router.push("/wallet");
  }

  return (
    <section className="page grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="panel space-y-5">
        <h1 className="text-3xl font-semibold">View-only wallet</h1>
        <p className="text-sm text-slate-300">
          Можно смотреть балансы и историю, но отправка невозможна, потому что приватного ключа нет.
        </p>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Wallet name</span>
          <input value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Public address</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button type="button" className="button-primary" onClick={() => void handleCreate()}>
          Save view-only wallet
        </button>
      </div>

      <aside className="panel space-y-4">
        <h2 className="text-xl font-semibold">What you can do</h2>
        <ul className="space-y-3 text-sm text-slate-300">
          <li>Просматривать native и token balances.</li>
          <li>Открывать историю транзакций и explorer links.</li>
          <li>Хранить контактные данные отдельно от private key.</li>
        </ul>
      </aside>
    </section>
  );
}
