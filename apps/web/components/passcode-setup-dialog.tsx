"use client";

import type { WalletPasscodeMode } from "@/lib/passcode-policy";
import { validateWalletPasscode } from "@/lib/passcode-policy";

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
              Acorus не ставит пароль автоматически. Введите любой пароль от 8 символов:
              цифры, буквы и символы можно смешивать. Он нужен только для локальной расшифровки vault.
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-600">Password</span>
            <input
              className="light-field"
              type="password"
              inputMode="text"
              autoComplete="new-password"
              value={props.passcode}
              onChange={(event) => {
                props.onModeChange("user");
                props.onPasscodeChange(event.target.value);
                props.onSavedConfirmationChange(false);
                props.onError(null);
              }}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-600">Confirm</span>
            <input
              className="light-field"
              type="password"
              inputMode="text"
              autoComplete="new-password"
              value={props.confirmPasscode}
              onChange={(event) => {
                props.onModeChange("user");
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
        </div>
      </section>
    </div>
  );
}
