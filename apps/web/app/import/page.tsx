"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  encryptVault,
  getEvmAddressFromMnemonic,
  getSolanaAddressFromMnemonic,
  validateWalletMnemonic,
} from "@acorus/wallet-core";
import { createWalletProfile } from "@/lib/api";
import { saveEncryptedVault } from "@/lib/storage";
import { useWalletStore } from "@/store/wallet-store";

export default function ImportWalletPage() {
  const router = useRouter();
  const userId = useWalletStore((state) => state.userId);
  const setEncryptedVault = useWalletStore((state) => state.setEncryptedVault);
  const unlockVault = useWalletStore((state) => state.unlockVault);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const setWalletError = useWalletStore((state) => state.setError);
  const [walletName, setWalletName] = useState("Imported wallet");
  const [mnemonic, setMnemonic] = useState("");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");

    if (!userId) {
      setError("Контекст пользователя ещё загружается.");
      return;
    }

    if (!validateWalletMnemonic(normalized)) {
      setError("Некорректная seed phrase.");
      return;
    }

    if (passcode.length < 4) {
      setError("Passcode должен быть минимум 4 символа.");
      return;
    }

    if (passcode !== confirmPasscode) {
      setError("Passcode и подтверждение не совпадают.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const evmAddress = getEvmAddressFromMnemonic(normalized);
      const solanaAddress = getSolanaAddressFromMnemonic(normalized);
      const plaintext = {
        mnemonic: normalized,
        evmAddress,
        createdAt: new Date().toISOString(),
      };
      const encrypted = await encryptVault(plaintext, passcode);
      const evmProfile = await createWalletProfile({
        userId,
        name: walletName,
        type: "local",
        publicAddress: evmAddress,
        chainFamily: "evm",
      });
      let solanaProfile = null;

      try {
        solanaProfile = await createWalletProfile({
          userId,
          name: `${walletName} · Solana`,
          type: "local",
          publicAddress: solanaAddress,
          chainFamily: "solana",
        });
      } catch {
        setWalletError("EVM vault imported, but Solana profile could not be added automatically yet.");
      }

      saveEncryptedVault(encrypted);
      setEncryptedVault(encrypted);
      unlockVault(plaintext);
      if (solanaProfile) {
        upsertProfile(solanaProfile);
      }
      upsertProfile(evmProfile);
      setActiveProfileId(evmProfile.id);
      setMnemonic("");
      setPasscode("");
      setConfirmPasscode("");
      router.push("/wallet");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось импортировать кошелек.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Import wallet</h1>
          <p className="mt-2 text-sm text-slate-300">
            Seed phrase валидируется, локально шифруется и используется для EVM + Solana derivation без отправки на backend.
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Wallet name</span>
          <input value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Seed phrase</span>
          <textarea
            rows={5}
            value={mnemonic}
            onChange={(event) => setMnemonic(event.target.value)}
            placeholder="Введите 12/24 слова через пробел"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Passcode</span>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Confirm passcode</span>
            <input
              type="password"
              value={confirmPasscode}
              onChange={(event) => setConfirmPasscode(event.target.value)}
            />
          </label>
        </div>

        <div className="warning-box text-sm leading-6">
          Перед импортом проверьте, что вы на доверенном устройстве и никто не видит seed phrase.
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="button"
          className="button-primary"
          disabled={loading}
          onClick={() => void handleImport()}
        >
          {loading ? "Importing..." : "Import and encrypt"}
        </button>
      </div>

      <aside className="panel space-y-4">
        <h2 className="text-xl font-semibold">Важно</h2>
        <ul className="space-y-3 text-sm leading-6 text-slate-300">
          <li>Seed phrase нигде не логируется и не отправляется на backend.</li>
          <li>После импорта в памяти останется только разблокированная сессия до lock/autolock.</li>
          <li>Passcode нужен только для локальной расшифровки vault.</li>
        </ul>
      </aside>
    </section>
  );
}
