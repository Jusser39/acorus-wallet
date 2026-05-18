import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCustomEvmNetwork,
  listExtensionNetworks,
  setActiveExtensionChainId,
} from "./extension-chain-registry";

const storage = new Map<string, unknown>();

beforeEach(() => {
  storage.clear();
  vi.restoreAllMocks();
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

describe("extension chain registry", () => {
  it("lists EVM, Solana, Tron, Bitcoin, and TON networks", async () => {
    const networks = await listExtensionNetworks();
    const families = new Set(networks.map((network) => network.family));

    expect(families.has("evm")).toBe(true);
    expect(families.has("solana")).toBe(true);
    expect(families.has("tron")).toBe(true);
    expect(families.has("utxo")).toBe(true);
    expect(families.has("ton")).toBe(true);
    expect(networks.some((network) => Number(network.chainId) === 43114)).toBe(true);
  });

  it("rejects unknown active chains", async () => {
    await expect(() => setActiveExtensionChainId("unknown-chain")).rejects.toThrow(/unsupported/i);
  });

  it("validates custom network input before RPC calls", async () => {
    await expect(() =>
      addCustomEvmNetwork({
        chainId: 999,
        chainName: "Local Test",
        nativeCurrency: {
          name: "Test",
          symbol: "TEST",
          decimals: 18,
        },
        rpcUrls: ["http://localhost:8545"],
      }),
    ).rejects.toThrow(/https/i);
  });

  it("persists a valid custom EVM network after RPC chainId validation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: "0x270f" }),
    })));

    const custom = await addCustomEvmNetwork({
      chainId: 9999,
      chainName: "Acorus Testnet",
      nativeCurrency: {
        name: "Acorus",
        symbol: "ACR",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.example.test"],
    });
    const networks = await listExtensionNetworks();

    expect(custom.isCustom).toBe(true);
    expect(networks.some((network) => network.chainId === 9999)).toBe(true);
  });

  it("does not persist duplicate builtin chains", async () => {
    const builtin = await addCustomEvmNetwork({
      chainId: 1,
      chainName: "Ethereum Duplicate",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.example.test"],
    });
    const stored = JSON.stringify(Object.fromEntries(storage.entries()));

    expect(builtin.isCustom).not.toBe(true);
    expect(stored).not.toContain("Ethereum Duplicate");
  });
});
