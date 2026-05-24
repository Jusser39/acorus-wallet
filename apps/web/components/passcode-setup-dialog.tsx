"use client";

import type { WalletPasscodeMode } from "@/lib/passcode-policy";
import { generateRandomWalletPasscode, validateWalletPasscode } from "@/lib/passcode-policy";

type PasscodeSetupDialogProps = {
  open: boolean;
  mode: WalletPasscodeMode;
  passcode: string;
  confirmPasscode: string;
  savedConfirmation: boolean;
  error?: string | null;
  onModeChange: (mode: WalletPasscodeMode) => void;
  onPasscodeChange: (value: string) => void;
  onConfirmPasscodeChange: (value: string) => void;
  onSavedConfirmationChange: (value: boolean) => void;
  onError: (value: string | null) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function PasscodeSetupDialog(props: PasscodeSetupDialogProps) {
  if (!props.open) {
    return null;
  }

  function handleGenerate() {
    try {
      const generated = generateRandomWalletPasscode();
      props.onModeChange("random");
      props.onPasscodeChange(generated);
      props.onConfirmPasscodeChange(generated);
      props.onSavedConfirmationChange(false);
      props.onError("Сохраните этот пароль в безопасном месте и отметьте подтверждение.");
    } catch (error) {
      props.onError(error instanceof Error ? error.message : "Не удалось сгенерировать пароль.");
    }
  }

  function handleConfirm() {
    const validation = validateWalletPasscode({
      mode: props.mode,
      passcode: props.passcode,
      confirmPasscode: props.confirmPasscode,
      savedConfirmation: props.savedConfirmation,
    });

    if (!validation.ok) {
      props.onError(validation.message);
      return;
    }

    props.onError(null);
    props.onConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <section className="magic-panel w-full max-w-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-violet-700">
              Wallet password
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Поставим пароль?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Acorus не ставит пароль автоматически. Выберите PIN или сгенерируйте случайный пароль.
              Он нужен только для локальной расшифровки vault.
            </p>
          </div>
          <button
            type="button"
            className="magic-button-secondary px-4 py-2"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-3xl border px-4 py-4 text-left ${
              props.mode === "pin"
                ? "border-violet-300 bg-violet-50 text-violet-950"
                : "border-white/70 bg-white/55 text-slate-700"
            }`}
            onClick={() => {
              props.onModeChange("pin");
              props.onPasscodeChange("");
              props.onConfirmPasscodeChange("");
              props.onSavedConfirmationChange(false);
              props.onError(null);
            }}
          >
            <span className="block text-lg font-black">Цифровой PIN</span>
            <span className="mt-1 block text-sm">6-12 цифр. Удобно для ежедневного unlock.</span>
          </button>
          <button
            type="button"
            className={`rounded-3xl border px-4 py-4 text-left ${
              props.mode === "random"
                ? "border-violet-300 bg-violet-50 text-violet-950"
                : "border-white/70 bg-white/55 text-slate-700"
            }`}
            onClick={handleGenerate}
          >
            <span className="block text-lg font-black">Случайный пароль</span>
            <span className="mt-1 block text-sm">Acorus сгенерирует сильный пароль, его нужно сохранить.</span>
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-600">
              {props.mode === "pin" ? "PIN" : "Password"}
            </span>
            <input
              className="light-field"
              type={props.mode === "pin" ? "password" : "text"}
              inputMode={props.mode === "pin" ? "numeric" : "text"}
              autoComplete="new-password"
              value={props.passcode}
              onChange={(event) => {
                props.onPasscodeChange(event.target.value);
                props.onSavedConfirmationChange(false);
                props.onError(null);
              }}
              placeholder={props.mode === "pin" ? "123456" : "Generate or type 12+ chars"}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-600">Confirm</span>
            <input
              className="light-field"
              type={props.mode === "pin" ? "password" : "text"}
              inputMode={props.mode === "pin" ? "numeric" : "text"}
              autoComplete="new-password"
              value={props.confirmPasscode}
              onChange={(event) => {
                props.onConfirmPasscodeChange(event.target.value);
                props.onSavedConfirmationChange(false);
                props.onError(null);
              }}
            />
          </label>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50/85 p-4 text-sm leading-6 text-amber-950">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={props.savedConfirmation}
            onChange={(event) => {
              props.onSavedConfirmationChange(event.target.checked);
              props.onError(null);
            }}
          />
          <span>
            Я сохранил(а) пароль. Если его потерять, Acorus не сможет расшифровать локальный vault.
          </span>
        </label>

        {props.error ? <p className="mt-4 text-sm font-bold text-rose-600">{props.error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="magic-button px-6 py-3" onClick={handleConfirm}>
            Use this password
          </button>
          <button type="button" className="magic-button-secondary px-6 py-3" onClick={handleGenerate}>
            Generate random
          </button>
        </div>
      </section>
    </div>
  );
}
