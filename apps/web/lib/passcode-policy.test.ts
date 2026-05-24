import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRandomWalletPasscode, validateWalletPasscode } from "./passcode-policy";

describe("wallet passcode policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts an explicit user password", () => {
    expect(
      validateWalletPasscode({
        mode: "user",
        passcode: "my-safe-password",
        confirmPasscode: "my-safe-password",
        savedConfirmation: true,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects short user passwords", () => {
    expect(
      validateWalletPasscode({
        mode: "user",
        passcode: "12345",
        confirmPasscode: "12345",
        savedConfirmation: true,
      }).ok,
    ).toBe(false);
  });

  it("keeps legacy pin/random modes as manual password aliases", () => {
    expect(
      validateWalletPasscode({
        mode: "pin",
        passcode: "12345678",
        confirmPasscode: "12345678",
        savedConfirmation: true,
      }),
    ).toEqual({ ok: true });
    expect(
      validateWalletPasscode({
        mode: "random",
        passcode: "Acorus-Generated-18",
        confirmPasscode: "Acorus-Generated-18",
        savedConfirmation: true,
      }),
    ).toEqual({ ok: true });
  });

  it("accepts non-numeric manual passwords", () => {
    expect(
      validateWalletPasscode({
        mode: "user",
        passcode: "letters-and-symbols!",
        confirmPasscode: "letters-and-symbols!",
        savedConfirmation: true,
      }),
    ).toEqual({ ok: true });
  });

  it("requires matching confirmation and saved acknowledgement", () => {
    expect(
      validateWalletPasscode({
        mode: "user",
        passcode: "Acorus-Generated-18",
        confirmPasscode: "Acorus-Generated-19",
        savedConfirmation: true,
      }).ok,
    ).toBe(false);
    expect(
      validateWalletPasscode({
        mode: "user",
        passcode: "Acorus-Generated-18",
        confirmPasscode: "Acorus-Generated-18",
        savedConfirmation: false,
      }).ok,
    ).toBe(false);
  });

  it("generates a bounded random password with Web Crypto", () => {
    vi.stubGlobal("crypto", {
      getRandomValues(bytes: Uint8Array) {
        bytes.forEach((_, index) => {
          bytes[index] = index + 1;
        });
        return bytes;
      },
    });

    expect(generateRandomWalletPasscode(14)).toHaveLength(14);
  });
});
