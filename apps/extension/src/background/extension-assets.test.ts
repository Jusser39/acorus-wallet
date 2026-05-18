import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAssetId,
  hideAsset,
  listWatchedAssets,
  unhideAsset,
  watchAsset,
} from "./extension-assets";

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

describe("extension assets", () => {
  it("saves watched ERC-20 assets", async () => {
    const watched = await watchAsset({
      family: "evm",
      chainId: 1,
      type: "erc20",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    });
    const assets = await listWatchedAssets();

    expect(watched.id).toBe("evm:1:erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48:USDC");
    expect(assets).toHaveLength(1);
  });

  it("rejects invalid ERC-20 addresses", async () => {
    await expect(() =>
      watchAsset({
        family: "evm",
        chainId: 1,
        type: "erc20",
        symbol: "BAD",
        name: "Bad Token",
        decimals: 18,
        tokenAddress: "0x123",
      }),
    ).rejects.toThrow(/address/i);
  });

  it("hides and unhides assets", async () => {
    const first = await hideAsset("evm:1:native:native:ETH");
    const second = await hideAsset("evm:1:native:native:ETH");
    const third = await unhideAsset("evm:1:native:native:ETH");

    expect(first).toEqual(["evm:1:native:native:ETH"]);
    expect(second).toEqual(["evm:1:native:native:ETH"]);
    expect(third).toEqual([]);
  });

  it("builds stable asset ids", () => {
    expect(buildAssetId({
      family: "evm",
      chainId: 137,
      type: "native",
      symbol: "POL",
      tokenAddress: null,
    })).toBe("evm:137:native:native:POL");
  });
});
