import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExtensionWallet,
  executeExtensionSignMessage,
  executeExtensionSignTypedData,
  getExtensionVaultStatus,
  importExtensionWallet,
  lockExtensionWallet,
  unlockExtensionWallet,
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

  it("imports the supplied test mnemonic and tolerates pasted punctuation", async () => {
    const imported = await importExtensionWallet({
      name: "Imported account",
      mnemonic:
        "1. boy, 2. resemble, 3. melody, 4. inspire, 5. waste, 6. fortune, 7. amused, 8. cube, 9. game, 10. demand, 11. clarify, 12. whip",
      passcode: "passcode-123",
    });

    expect(imported.account).toBe("0x0aC05912c2B7216f45E21fe52F92d886f380eB90");
  });

  it("locks and unlocks the encrypted extension vault", async () => {
    await importExtensionWallet({
      name: "Imported",
      mnemonic: "test test test test test test test test test test test junk",
      passcode: "strong-passcode",
    });

    expect((await getExtensionVaultStatus()).isUnlocked).toBe(true);
    await lockExtensionWallet();
    expect((await getExtensionVaultStatus()).isUnlocked).toBe(false);

    const unlocked = await unlockExtensionWallet({
      passcode: "strong-passcode",
    });

    expect(unlocked.isUnlocked).toBe(true);
    expect(unlocked.profiles[0]?.account.toLowerCase()).toBe(
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    );
  });

  it("signs a personal message only while the extension wallet is unlocked", async () => {
    await importExtensionWallet({
      name: "Imported",
      mnemonic: "test test test test test test test test test test test junk",
      passcode: "strong-passcode",
    });

    const signature = await executeExtensionSignMessage({
      params: ["Hello Acorus", "0xF39Fd6e51aad88F6F4ce6AB8827279cffFb92266"],
      chainId: 1,
      account: "0xF39Fd6e51aad88F6F4ce6AB8827279cffFb92266",
    });

    expect(signature).toMatch(/^0x[0-9a-f]+$/iu);

    await lockExtensionWallet();

    await expect(() =>
      executeExtensionSignMessage({
        params: ["Hello again"],
        chainId: 1,
      }),
    ).rejects.toThrow(/unlock/i);
  });

  it("signs typed data inside the extension vault boundary", async () => {
    await importExtensionWallet({
      name: "Imported",
      mnemonic: "test test test test test test test test test test test junk",
      passcode: "strong-passcode",
    });

    const signature = await executeExtensionSignTypedData({
      params: [
        "0xF39Fd6e51aad88F6F4ce6AB8827279cffFb92266",
        JSON.stringify({
          domain: {
            name: "Acorus",
            version: "1",
            chainId: 1,
          },
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
            ],
            Message: [
              { name: "contents", type: "string" },
            ],
          },
          primaryType: "Message",
          message: {
            contents: "Acorus typed data",
          },
        }),
      ],
      chainId: 1,
      account: "0xF39Fd6e51aad88F6F4ce6AB8827279cffFb92266",
    });

    expect(signature).toMatch(/^0x[0-9a-f]+$/iu);
  });
});
