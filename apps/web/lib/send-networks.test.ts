import { describe, expect, it } from "vitest";
import { buildSendNetworkOptions, findSendNetworkOption } from "./send-networks";

describe("buildSendNetworkOptions", () => {
  it("includes EVM chains as supported", () => {
    const options = buildSendNetworkOptions();
    const evmOptions = options.filter((n) => n.family === "evm");
    expect(evmOptions.length).toBeGreaterThan(0);
    for (const option of evmOptions) {
      expect(option.sendStatus).toBe("supported");
      expect(option.isSkeleton).toBe(false);
    }
  });

  it("marks solana as supported", () => {
    const options = buildSendNetworkOptions();
    const solana = options.find((n) => n.family === "solana");
    expect(solana).toBeTruthy();
    expect(solana!.sendStatus).toBe("supported");
  });

  it("marks tron and utxo as skeleton", () => {
    const options = buildSendNetworkOptions();
    const tron = options.find((n) => n.family === "tron");
    const utxo = options.find((n) => n.family === "utxo");
    expect(tron?.sendStatus).toBe("skeleton");
    expect(utxo?.sendStatus).toBe("skeleton");
  });

  it("produces unique ids", () => {
    const options = buildSendNetworkOptions();
    const ids = options.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("findSendNetworkOption", () => {
  it("finds ethereum mainnet", () => {
    const option = findSendNetworkOption({ family: "evm", chainId: 1 });
    expect(option).toBeTruthy();
    expect(option!.label).toMatch(/ethereum/i);
  });

  it("returns null for unknown network", () => {
    const option = findSendNetworkOption({ family: "evm", chainId: 99999 });
    expect(option).toBeNull();
  });
});
