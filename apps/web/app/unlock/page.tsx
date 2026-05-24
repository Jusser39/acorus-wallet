"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { decryptVault } from "@acorus/wallet-core";
import { useWalletStore } from "@/store/wallet-store";
import { PinPad } from "@/components/pin-pad";
import { clearAcorusLocalWalletState } from "@/lib/reset-local-wallet";
import { loadVaultMeta, type VaultMeta } from "@/lib/storage";
import { resolveWalletVaultUiState } from "@/lib/wallet-vault-state";

function UnlockLoading() {
  return (
    <section className="magic-shell grid min-h-screen place-items-center px-4 py-10">
      <div className="magic-panel w-full max-w-md p-7 text-center">
        <div className="magic-orb mx-auto h-16 w-16 text-xl font-black text-white">A</div>
        <h1 className="mt-5 text-3xl font-black">Loading wallet</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Checking local encrypted vault state on this device.
        </p>
      </div>
    </section>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<UnlockLoading />}>
      <UnlockPageContent />
    </Suspense>
  );
}

function UnlockPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBootstrapped = useWalletStore((state) => state.isBootstrapped);
  const encryptedVault = useWalletStore((state) => state.encryptedVault);
  const unlockedVault = useWalletStore((state) => state.unlockedVault);
  const profiles = useWalletStore((state) => state.profiles);
  const bootstrapError = useWalletStore((state) => state.error);
  const unlockVault = useWalletStore((state) => state.unlockVault);
  const clearWalletState = useWalletStore((state) => state.clearWalletState);
  const [passcode, setPasscode] = useState("");
  const [resetText, setResetText] = useState("");
  const [vaultMeta, setVaultMeta] = useState<VaultMeta | null>(null);
  const forceRepair = searchParams.get("repair") === "1";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVaultMeta(loadVaultMeta());
  }, [encryptedVault]);

  const uiState = useMemo(
    () =>
      resolveWalletVaultUiState({
        hasEncryptedVault: Boolean(encryptedVault),
        encryptedVaultVersion: encryptedVault?.version ?? null,
        hasVaultMeta: Boolean(vaultMeta),
        profileCount: profiles.filter((profile) => profile.type === "local").length,
        hasLocalProfile: profiles.some((profile) => profile.type === "local"),
        isUnlocked: Boolean(unlockedVault),
        passcodeInitialized: vaultMeta?.passcodeInitialized,
        passcodeSetupConfirmedAt: vaultMeta?.passcodeSetupConfirmedAt,
        vaultReadError: bootstrapError?.includes("vault") ? bootstrapError : null,
      }),
    [bootstrapError, encryptedVault, profiles, unlockedVault, vaultMeta],
  );

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
      setPasscode("");
      setError(nextError instanceof Error ? nextError.message : "Не удалось разблокировать кошелек.");
    } finally {
      setLoading(false);
    }
  }

  function handleResetLocalWallet() {
    clearAcorusLocalWalletState();
    clearWalletState();
    setPasscode("");
    setResetText("");
    window.location.assign("/");
  }

  if (!isBootstrapped) {
    return <UnlockLoading />;
  }

  if (uiState.kind === "empty" && !forceRepair) {
    return (
      <section className="magic-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="magic-panel w-full max-w-lg p-7 text-center">
          <div className="magic-orb mx-auto h-16 w-16 text-xl font-black text-white">A</div>
          <h1 className="mt-5 text-3xl font-black">Create or import your wallet</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            No encrypted vault was found in this browser. Start with a local wallet,
            import an existing seed phrase, or connect the extension.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href="/create" className="magic-button px-5 py-3 text-center">Create wallet</Link>
            <Link href="/import" className="magic-button-secondary px-5 py-3 text-center">Import wallet</Link>
            <Link href="/extension" className="magic-button-secondary px-5 py-3 text-center">Connect extension</Link>
            <Link href="/practice" className="magic-button-secondary px-5 py-3 text-center">Practice mode</Link>
          </div>
        </div>
      </section>
    );
  }

  if (uiState.kind === "repair_required" || forceRepair) {
    const repairMessage =
      uiState.kind === "repair_required"
        ? uiState.message
        : "Use this recovery path only if you have a seed phrase backup or this browser state is stale.";

    return (
      <section className="magic-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="magic-panel w-full max-w-xl p-7">
          <div className="flex items-center gap-4">
            <div className="magic-orb h-16 w-16 text-xl font-black text-white">A</div>
            <div>
              <h1 className="text-3xl font-black">Local wallet state needs repair</h1>
              <p className="mt-1 text-sm text-slate-600">{repairMessage}</p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
            Пароль нельзя снять с уже зашифрованного vault без расшифровки.
            Если вы его не создавали, это старый локальный state. Reset удалит
            только локальный encrypted vault в этом браузере. Активы в блокчейне
            не удаляются, но для восстановления нужна seed phrase.
          </div>
          <label className="mt-6 block space-y-2">
            <span className="text-sm font-bold text-slate-700">Type RESET to confirm</span>
            <input
              value={resetText}
              onChange={(event) => setResetText(event.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-slate-950 outline-none focus:border-fuchsia-300"
              placeholder="RESET"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-rose-500 px-5 py-3 font-black text-white disabled:opacity-45"
              disabled={resetText !== "RESET"}
              onClick={handleResetLocalWallet}
            >
              Reset local wallet state
            </button>
            <Link href="/import" className="magic-button-secondary px-5 py-3">Import seed phrase</Link>
            <Link href="/" className="magic-button-secondary px-5 py-3">Back home</Link>
          </div>
        </div>
      </section>
    );
  }

  if (uiState.kind === "unlocked") {
    return (
      <section className="magic-shell grid min-h-screen place-items-center px-4 py-10">
        <div className="magic-panel w-full max-w-md p-7 text-center">
          <div className="magic-orb mx-auto h-16 w-16 text-xl font-black text-white">A</div>
          <h1 className="mt-5 text-3xl font-black">Wallet is unlocked</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your local vault session is active on this device.
          </p>
          <Link href="/wallet" className="magic-button mt-7 inline-flex px-6 py-3">
            Open wallet
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="magic-shell grid min-h-screen place-items-center px-4 py-10">
      <div className="magic-panel w-full max-w-sm space-y-8 p-7 text-center">
        <div>
          <div className="magic-orb mx-auto mb-5 h-16 w-16 text-xl font-black text-white">A</div>
          <h1 className="text-3xl font-black">Unlock wallet</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Decryption happens locally. Passcode is never sent outside this browser.
          </p>
        </div>

        {!encryptedVault ? (
          <div className="warning-box text-sm text-left">
            {bootstrapError ??
              "Encrypted vault не найден. Сначала создайте или импортируйте кошелек на этом устройстве."}
          </div>
        ) : null}

        <PinPad
          value={passcode}
          onChange={setPasscode}
          onConfirm={() => void handleUnlock()}
          error={error}
          disabled={loading || !encryptedVault}
        />
        <Link href="/unlock?repair=1" className="text-sm font-bold text-violet-700">
          Forgot passcode or never created one?
        </Link>
      </div>
    </section>
  );
}
