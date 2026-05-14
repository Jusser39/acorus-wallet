"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decryptVault } from "@acorus/wallet-core";
import { loadEncryptedVault } from "@/lib/storage";
import { useWalletStore } from "@/store/wallet-store";

export default function UnlockPage() {
  const router = useRouter();
  const encryptedVault = useWalletStore((state) => state.encryptedVault) ?? loadEncryptedVault();
  const unlockVault = useWalletStore((state) => state.unlockVault);
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    if (!encryptedVault) {
      setError("Encrypted vault не найден. Сначала создайте или импортируйте кошелек.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const vault = await decryptVault(encryptedVault, passcode);
      unlockVault(vault);
      setPasscode("");
      router.push("/wallet");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось разблокировать кошелек.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page grid place-items-center">
      <div className="panel w-full max-w-xl space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Unlock wallet</h1>
          <p className="mt-2 text-sm text-slate-300">
            Расшифровка выполняется локально. Passcode не хранится и не отправляется наружу.
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Passcode</span>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="button"
          className="button-primary"
          disabled={loading}
          onClick={() => void handleUnlock()}
        >
          {loading ? "Unlocking..." : "Unlock"}
        </button>
      </div>
    </section>
  );
}
