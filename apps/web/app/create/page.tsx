"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  encryptVault,
  generateWalletMnemonic,
  getEvmAddressFromMnemonic,
  getSolanaAddressFromMnemonic,
} from "@acorus/wallet-core";
import { createWalletProfile } from "@/lib/api";
import { saveEncryptedVault } from "@/lib/storage";
import { useWalletStore } from "@/store/wallet-store";

export default function CreateWalletPage() {
  const router = useRouter();
  const isBootstrapped = useWalletStore((state) => state.isBootstrapped);
  const userId = useWalletStore((state) => state.userId);
  const setEncryptedVault = useWalletStore((state) => state.setEncryptedVault);
  const unlockVault = useWalletStore((state) => state.unlockVault);
  const upsertProfile = useWalletStore((state) => state.upsertProfile);
  const setActiveProfileId = useWalletStore((state) => state.setActiveProfileId);
  const setWalletError = useWalletStore((state) => state.setError);
  const [mnemonic, setMnemonic] = useState("");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [walletName, setWalletName] = useState("Main wallet");
  const [savedSeed, setSavedSeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(() => mnemonic.split(" ").filter(Boolean), [mnemonic]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMnemonic(generateWalletMnemonic());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleCreate() {
    if (!userId) {
      setError("Контекст пользователя ещё загружается.");
      return;
    }

    if (!savedSeed) {
      setError("Подтвердите, что вы сохранили seed phrase.");
      return;
    }

    if (!mnemonic) {
      setError("Seed phrase ещё генерируется. Подождите секунду и попробуйте снова.");
      return;
    }

    if (passcode.length < 8) {
      setError("Passcode должен быть минимум 8 символов.");
      return;
    }

    if (passcode !== confirmPasscode) {
      setError("Passcode и подтверждение не совпадают.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const evmAddress = getEvmAddressFromMnemonic(mnemonic);
      const solanaAddress = getSolanaAddressFromMnemonic(mnemonic);
      const plaintext = {
        mnemonic,
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
        setWalletError("EVM vault created, but Solana profile could not be added automatically yet.");
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
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать кошелек.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Create wallet</h1>
          <p className="mt-2 text-sm text-slate-300">
            Seed phrase создается только в браузере, локально шифруется и используется для EVM + Solana адресов. Backend ее не получает.
          </p>
        </div>

        <div className="warning-box text-sm leading-6">
          Seed phrase = полный доступ к средствам. Не отправляйте ее в Telegram, WhatsApp,
          сайты или чаты. Администрация кошелька не сможет восстановить ваши слова.
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Wallet name</span>
          <input value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>

        {words.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {words.map((word, index) => (
              <div key={`${word}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
                <span className="mr-2 text-slate-500">{index + 1}.</span>
                {word}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm text-slate-300">
            Генерируем seed phrase в браузере...
          </div>
        )}

        <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={savedSeed}
            onChange={(event) => setSavedSeed(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>Я сохранил(а) seed phrase в безопасном оффлайн-месте и понимаю, что ее потеря может привести к потере доступа.</span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Passcode</span>
            <input
              type="password"
              autoComplete="new-password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Confirm passcode</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPasscode}
              onChange={(event) => setConfirmPasscode(event.target.value)}
            />
          </label>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          type="button"
          className="button-primary"
          disabled={!isBootstrapped || loading || !mnemonic}
          onClick={() => void handleCreate()}
        >
          {loading ? "Creating..." : "Create encrypted wallet"}
        </button>
      </div>

      <aside className="panel space-y-4">
        <h2 className="text-xl font-semibold">Security checklist</h2>
        <ul className="space-y-3 text-sm leading-6 text-slate-300">
          <li>Подпись транзакций будет выполняться только на клиенте.</li>
          <li>В localStorage хранится только encrypted vault, а не raw mnemonic.</li>
          <li>Для каждой отправки в mainnet будет отдельное подтверждение.</li>
          <li>Если потерять и seed phrase, и passcode — восстановить доступ не получится.</li>
        </ul>
      </aside>
    </section>
  );
}
