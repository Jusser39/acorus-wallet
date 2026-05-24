"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  encryptVault,
  getEvmAddressFromMnemonic,
  getSolanaAddressFromMnemonic,
  validateWalletMnemonic,
} from "@acorus/wallet-core";
import { PasscodeSetupDialog } from "@/components/passcode-setup-dialog";
import { createWalletProfile } from "@/lib/api";
import type { WalletPasscodeMode } from "@/lib/passcode-policy";
import { validateWalletPasscode } from "@/lib/passcode-policy";
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
  const [passcodeMode, setPasscodeMode] = useState<WalletPasscodeMode>("pin");
  const [passcodeSetupOpen, setPasscodeSetupOpen] = useState(false);
  const [passcodeSaved, setPasscodeSaved] = useState(false);
  const [passcodeConfirmed, setPasscodeConfirmed] = useState(false);
  const [passcodeDialogError, setPasscodeDialogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ensurePasscodeReady(): boolean {
    const validation = validateWalletPasscode({
      mode: passcodeMode,
      passcode,
      confirmPasscode,
      savedConfirmation: passcodeSaved,
    });

    if (!passcodeConfirmed || !validation.ok) {
      setPasscodeDialogError(
        validation.ok
          ? "Подтвердите выбранный пароль перед импортом wallet vault."
          : validation.message,
      );
      setPasscodeSetupOpen(true);
      return false;
    }

    return true;
  }

  function resetPasscodeConfirmation() {
    setPasscodeConfirmed(false);
    setPasscodeSaved(false);
  }

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

    if (!ensurePasscodeReady()) {
      setError("Сначала выберите пароль для импортируемого wallet vault.");
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

      saveEncryptedVault(encrypted, { passcodeMode });
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
      resetPasscodeConfirmation();
      router.push("/wallet");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось импортировать кошелек.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <section className="page grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel space-y-5">
        <div>
          <h1 className="text-3xl font-semibold">Import wallet</h1>
          <p className="mt-2 text-sm text-slate-600">
            Seed phrase валидируется, локально шифруется и используется для EVM + Solana derivation без отправки на backend. Пароль выбираете только вы; Acorus не ставит его автоматически.
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-600">Wallet name</span>
          <input className="light-field" value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-600">Seed phrase</span>
          <textarea
            className="light-field"
            rows={5}
            value={mnemonic}
            onChange={(event) => setMnemonic(event.target.value)}
            placeholder="Введите 12/24 слова через пробел"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <div className="rounded-[1.5rem] border border-fuchsia-100 bg-white/70 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">Пароль wallet vault</p>
              <p className="mt-1 leading-6 text-slate-600">
                {passcodeConfirmed
                  ? `Выбран ${passcodeMode === "pin" ? "цифровой PIN" : "случайный пароль"}. Acorus не знает и не восстанавливает его.`
                  : "Пароль не ставится автоматически. Перед импортом выберите PIN или случайный пароль."}
              </p>
            </div>
            <button
              type="button"
              className="magic-button-secondary px-5 py-3"
              onClick={() => {
                setPasscodeDialogError(null);
                setPasscodeSetupOpen(true);
              }}
            >
              {passcodeConfirmed ? "Изменить пароль" : "Поставим пароль?"}
            </button>
          </div>
        </div>

        <div className="warning-box text-sm leading-6">
          Перед импортом проверьте, что вы на доверенном устройстве и никто не видит seed phrase.
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

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
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Seed phrase нигде не логируется и не отправляется на backend.</li>
          <li>После импорта в памяти останется только разблокированная сессия до lock/autolock.</li>
          <li>Passcode нужен только для локальной расшифровки vault.</li>
        </ul>
      </aside>
    </section>
    <PasscodeSetupDialog
      open={passcodeSetupOpen}
      mode={passcodeMode}
      passcode={passcode}
      confirmPasscode={confirmPasscode}
      savedConfirmation={passcodeSaved}
      error={passcodeDialogError}
      onModeChange={(mode) => {
        setPasscodeMode(mode);
        setPasscodeConfirmed(false);
        setPasscodeSaved(false);
      }}
      onPasscodeChange={(value) => {
        setPasscode(value);
        setPasscodeConfirmed(false);
      }}
      onConfirmPasscodeChange={(value) => {
        setConfirmPasscode(value);
        setPasscodeConfirmed(false);
      }}
      onSavedConfirmationChange={(saved) => {
        setPasscodeSaved(saved);
        if (!saved) {
          setPasscodeConfirmed(false);
        }
      }}
      onError={setPasscodeDialogError}
      onConfirm={() => {
        setPasscodeConfirmed(true);
        setPasscodeSetupOpen(false);
        setPasscodeDialogError(null);
        setError(null);
      }}
      onClose={() => setPasscodeSetupOpen(false)}
    />
    </>
  );
}
