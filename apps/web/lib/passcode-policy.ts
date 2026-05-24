export type WalletPasscodeMode = "pin" | "random";

export type WalletPasscodeValidation =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

const RANDOM_PASSCODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_=+?";

export function validateWalletPasscode(input: {
  passcode: string;
  confirmPasscode: string;
  mode: WalletPasscodeMode;
  savedConfirmation?: boolean;
}): WalletPasscodeValidation {
  const passcode = input.passcode.trim();
  const confirmPasscode = input.confirmPasscode.trim();

  if (input.mode === "pin") {
    if (!/^\d{6,12}$/u.test(passcode)) {
      return {
        ok: false,
        message: "PIN должен содержать только цифры и быть длиной от 6 до 12 символов.",
      };
    }
  } else if (passcode.length < 12) {
    return {
      ok: false,
      message: "Случайный пароль должен быть минимум 12 символов.",
    };
  }

  if (passcode !== confirmPasscode) {
    return {
      ok: false,
      message: "Пароль и подтверждение не совпадают.",
    };
  }

  if (input.savedConfirmation !== true) {
    return {
      ok: false,
      message: "Подтвердите, что вы сохранили пароль. Без него vault не расшифровать.",
    };
  }

  return { ok: true };
}

export function generateRandomWalletPasscode(length = 18): string {
  const normalizedLength = Math.max(12, Math.min(64, Math.floor(length)));
  const bytes = new Uint8Array(normalizedLength);

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random generator is unavailable in this browser.");
  }

  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => RANDOM_PASSCODE_ALPHABET[byte % RANDOM_PASSCODE_ALPHABET.length]).join("");
}
