import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExtensionWallet,
  getExtensionVaultStatus,
  importExtensionWallet,
} from "./extension-wallet";

const storage = new Map<string, unknown>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        async get(keys?: string | string[] | Record<string, unknown> | null) {
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, storage.get(key)]));
          }

          if (typeof keys === "string") {
            return { [keys]: storage.get(keys) };
          }

          return Object.fromEntries(storage.entries());
        },
        async set(items: Record<string, unknown>) {
          for (const [key, value] of Object.entries(items)) {
            storage.set(key, value);
          }
        },
      },
    },
  });
});

describe("extension wallet vault", () => {
  it("creates an encrypted extension wallet without persisting the raw mnemonic", async () => {
    const created = await createExtensionWallet({
      name: "Main extension wallet",
      passcode: "strong-passcode",
    });

    expect(created.mnemonic.split(" ")).toHaveLength(12);
    expect(created.account).toMatch(/^0x/u);

    const stored = JSON.stringify(Object.fromEntries(storage.entries()));
    expect(stored).not.toContain(created.mnemonic);

    const status = await getExtensionVaultStatus();
    expect(status.hasVault).toBe(true);
    expect(status.profiles[0]?.account).toBe(created.account);
    expect(status.profiles[0]?.chainFamily).toBe("evm");
  });

  it("imports a valid mnemonic into the extension vault", async () => {
    const imported = await importExtensionWallet({
      name: "Imported",
      mnemonic: "test test test test test test test test test test test junk",
      passcode: "strong-passcode",
    });

    expect(imported.account.toLowerCase()).toBe(
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    );
    expect(imported.warning).toContain("encrypted vault");
  });
});
