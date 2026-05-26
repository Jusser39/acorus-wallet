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
import { PasscodeSetupDialog } from "@/components/passcode-setup-dialog";
import {
  createExtensionWallet,
  getExtensionVaultStatus,
  hasAcorusExtension,
  requestAcorusProviderDiscovery,
  type ExtensionVaultStatus,
} from "@/lib/extension-bridge";
import type { WalletPasscodeMode } from "@/lib/passcode-policy";
import { validateWalletPasscode } from "@/lib/passcode-policy";
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
  const [passcodeMode, setPasscodeMode] = useState<WalletPasscodeMode>("user");
  const [passcodeSetupOpen, setPasscodeSetupOpen] = useState(false);
  const [passcodeSaved, setPasscodeSaved] = useState(false);
  const [passcodeConfirmed, setPasscodeConfirmed] = useState(false);
  const [passcodeDialogError, setPasscodeDialogError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("Main wallet");
  const [savedSeed, setSavedSeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extensionLoading, setExtensionLoading] = useState(false);
  const [extensionResult, setExtensionResult] = useState<{
    mnemonic: string;
    account: string;
    warning: string;
  } | null>(null);
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionVaultStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(() => mnemonic.split(" ").filter(Boolean), [mnemonic]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMnemonic(generateWalletMnemonic());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    let detectionTimer: number | null = null;

    const detectExtension = () => {
      requestAcorusProviderDiscovery();
      detectionTimer = window.setTimeout(() => {
        if (!mounted) {
          return;
        }

        const detected = hasAcorusExtension();
        setExtensionDetected(detected);

        if (!detected) {
          return;
        }

        void getExtensionVaultStatus()
          .then((status) => {
            if (mounted) {
              setExtensionStatus(status);
            }
          })
          .catch(() => {
            if (mounted) {
              setExtensionStatus(null);
            }
          });
      }, 100);
    };

    detectExtension();

    return () => {
      mounted = false;
      if (detectionTimer !== null) {
        window.clearTimeout(detectionTimer);
      }
    };
  }, []);

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
          ? "Подтвердите выбранный пароль перед созданием wallet vault."
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

    if (!ensurePasscodeReady()) {
      setError("Сначала задайте пароль для local browser vault.");
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
      setError(nextError instanceof Error ? nextError.message : "Не удалось создать кошелек.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInExtension() {
    if (!ensurePasscodeReady()) {
      setError("Сначала выберите пароль для extension vault.");
      return;
    }

    setExtensionLoading(true);
    setError(null);

    try {
      const created = await createExtensionWallet({
        name: walletName,
        passcode,
      });
      setExtensionResult({
        mnemonic: created.mnemonic,
        account: created.account,
        warning: created.warning,
      });
      setPasscode("");
      setConfirmPasscode("");
      resetPasscodeConfirmation();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось создать кошелек в расширении.",
      );
    } finally {
      setExtensionLoading(false);
    }
  }

  function renderPasscodeSetupCard(scope: "extension" | "local") {
    return (
      <div className="rounded-[1.5rem] border border-fuchsia-100 bg-white/70 p-4 text-sm text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-950">Пароль wallet vault</p>
            <p className="mt-1 leading-6 text-slate-600">
              {passcodeConfirmed
                ? "Пароль выбран вручную. Acorus не знает и не восстанавливает его."
                : `Для ${scope === "extension" ? "extension" : "local browser"} vault пароль не ставится автоматически.`}
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
    );
  }

  return (
    <>
    <section className="page grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="panel order-first space-y-5 lg:order-last">
        <div>
          <span className="section-kicker !border-slate-900/10 !bg-white/80 !text-slate-700">Extension first</span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Create in Acorus extension</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Создание кошелька должно происходить в расширении: seed phrase и encrypted vault остаются внутри Chrome extension, сайт только отправляет команду.
          </p>
        </div>

        <div className={`rounded-[1.5rem] border p-4 text-sm ${extensionDetected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {extensionDetected
            ? `Acorus extension detected${extensionStatus?.hasVault ? " · vault exists" : " · ready to create vault"}`
            : "Acorus extension was not detected in this browser profile. Install/reload the extension before creating the production wallet."}
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-600">Wallet name</span>
          <input className="light-field" value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>

        {renderPasscodeSetupCard("extension")}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="button"
          className="button-primary w-full"
          disabled={!extensionDetected || extensionLoading}
          onClick={() => void handleCreateInExtension()}
        >
          {extensionLoading ? "Creating in extension..." : "Create wallet in extension"}
        </button>
        {extensionResult ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Extension wallet created</p>
            <p className="mt-2 break-all">{extensionResult.account}</p>
            <p className="mt-3 text-amber-800">{extensionResult.warning}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {extensionResult.mnemonic.split(" ").map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2"
                >
                  {index + 1}. {word}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="h-px bg-fuchsia-100" />

        <h2 className="text-xl font-semibold text-slate-950">Security checklist</h2>
        <ul className="space-y-3 text-sm leading-6 text-slate-600">
          <li>Подпись транзакций выполняется только на клиенте.</li>
          <li>Сайт не получает raw mnemonic или private key.</li>
          <li>Для отправки и swap в mainnet остается отдельное подтверждение.</li>
          <li>Если потерять seed phrase и passcode, восстановить доступ не получится.</li>
        </ul>
      </aside>

      <details className="panel space-y-5">
        <summary className="cursor-pointer text-lg font-semibold text-slate-950">Legacy local web vault fallback</summary>
        <div className="mt-5 space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Local browser fallback</h2>
          <p className="mt-2 text-sm text-slate-600">
            Seed phrase создается только в браузере, локально шифруется и используется для EVM + Solana адресов. Backend ее не получает.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
          Seed phrase = полный доступ к средствам. Не отправляйте ее в Telegram, WhatsApp,
          сайты или чаты. Администрация кошелька не сможет восстановить ваши слова.
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-600">Wallet name</span>
          <input className="light-field" value={walletName} onChange={(event) => setWalletName(event.target.value)} />
        </label>

        {words.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {words.map((word, index) => (
              <div key={`${word}-${index}`} className="rounded-2xl border border-fuchsia-100 bg-white px-4 py-3 text-sm text-slate-950">
                <span className="mr-2 text-slate-500">{index + 1}.</span>
                {word}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-fuchsia-100 bg-white/70 px-4 py-5 text-sm text-slate-600">
            Генерируем seed phrase в браузере...
          </div>
        )}

        <label className="flex items-start gap-3 rounded-2xl border border-fuchsia-100 bg-white/70 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={savedSeed}
            onChange={(event) => setSavedSeed(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>Я сохранил(а) seed phrase в безопасном оффлайн-месте и понимаю, что ее потеря может привести к потере доступа.</span>
        </label>

        {renderPasscodeSetupCard("local")}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="button"
          className="button-primary"
          disabled={!isBootstrapped || loading || !mnemonic}
          onClick={() => void handleCreate()}
        >
          {loading ? "Creating..." : "Create encrypted wallet"}
        </button>
        </div>
      </details>
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
