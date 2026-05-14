import { describe, expect, it } from "vitest";
import {
  decryptVault,
  encryptVault,
  generateWalletMnemonic,
  getEvmAddressFromMnemonic,
  getRpcUrl,
  validateWalletMnemonic,
} from "./index";
import type { WalletVaultPlaintext } from "./types";

describe("wallet-core", () => {
  it("generates a valid mnemonic", () => {
    const mnemonic = generateWalletMnemonic();

    expect(validateWalletMnemonic(mnemonic)).toBe(true);
  });

  it("encrypts and decrypts a vault", async () => {
    const plaintext: WalletVaultPlaintext = {
      mnemonic: "test test test test test test test test test test test junk",
      evmAddress: "0xf39Fd6e51aad88F6F4ce6ab8827279cffFb92266",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const encrypted = await encryptVault(plaintext, "123456");
    const decrypted = await decryptVault(encrypted, "123456");

    expect(decrypted).toEqual(plaintext);
  });

  it("fails on wrong passcode", async () => {
    const plaintext: WalletVaultPlaintext = {
      mnemonic: "test test test test test test test test test test test junk",
      evmAddress: "0xf39Fd6e51aad88F6F4ce6ab8827279cffFb92266",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const encrypted = await encryptVault(plaintext, "123456");

    await expect(decryptVault(encrypted, "654321")).rejects.toThrow(
      "Unable to unlock wallet with the provided passcode.",
    );
  });

  it("derives a stable EVM address", () => {
    expect(
      getEvmAddressFromMnemonic(
        "test test test test test test test test test test test junk",
      ),
    ).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("does not leak mnemonic in encrypted payload", async () => {
    const mnemonic = "test test test test test test test test test test test junk";
    const encrypted = await encryptVault(
      {
        mnemonic,
        evmAddress: "0xf39Fd6e51aad88F6F4ce6ab8827279cffFb92266",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      "123456",
    );

    expect(JSON.stringify(encrypted)).not.toContain(mnemonic);
  });

  it("resolves chain config through env", () => {
    const env = {
      NEXT_PUBLIC_ETH_RPC_URL: "https://example.com/eth",
      NEXT_PUBLIC_BSC_RPC_URL: "https://example.com/bsc",
      NEXT_PUBLIC_POLYGON_RPC_URL: "https://example.com/polygon",
      NEXT_PUBLIC_ARBITRUM_RPC_URL: "https://example.com/arbitrum",
      NEXT_PUBLIC_OPTIMISM_RPC_URL: "https://example.com/optimism",
      NEXT_PUBLIC_BASE_RPC_URL: "https://example.com/base",
    };

    expect(getRpcUrl(1, env)).toBe("https://example.com/eth");
    expect(getRpcUrl(56, env)).toBe("https://example.com/bsc");
    expect(getRpcUrl(137, env)).toBe("https://example.com/polygon");
    expect(getRpcUrl(42161, env)).toBe("https://example.com/arbitrum");
    expect(getRpcUrl(10, env)).toBe("https://example.com/optimism");
    expect(getRpcUrl(8453, env)).toBe("https://example.com/base");
  });
});
