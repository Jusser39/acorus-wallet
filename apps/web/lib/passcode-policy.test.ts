import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRandomWalletPasscode, validateWalletPasscode } from "./passcode-policy";

describe("wallet passcode policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts an explicit numeric PIN", () => {
    expect(
      validateWalletPasscode({
        mode: "pin",
        passcode: "123456",
        confirmPasscode: "123456",
        savedConfirmation: true,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects short or non-numeric PIN values", () => {
    expect(
      validateWalletPasscode({
        mode: "pin",
        passcode: "12345",
        confirmPasscode: "12345",
        savedConfirmation: true,
      }).ok,
    ).toBe(false);
    expect(
      validateWalletPasscode({
        mode: "pin",
        passcode: "12345a",
        confirmPasscode: "12345a",
        savedConfirmation: true,
      }).ok,
    ).toBe(false);
  });

  it("accepts an explicit random password", () => {
    expect(
      validateWalletPasscode({
        mode: "random",
        passcode: "Acorus-Generated-18",
        confirmPasscode: "Acorus-Generated-18",
        savedConfirmation: true,
      }),
    ).toEqual({ ok: true });
  });

  it("requires matching confirmation and saved acknowledgement", () => {
    expect(
      validateWalletPasscode({
        mode: "random",
        passcode: "Acorus-Generated-18",
        confirmPasscode: "Acorus-Generated-19",
        savedConfirmation: true,
      }).ok,
    ).toBe(false);
    expect(
      validateWalletPasscode({
        mode: "random",
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
