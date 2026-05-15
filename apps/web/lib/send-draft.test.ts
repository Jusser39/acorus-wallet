import { describe, expect, it } from "vitest";
import { createUniversalSendDraft } from "./send-draft";

describe("frontend universal send draft", () => {
  it("creates EVM draft", async () => {
    const draft = await createUniversalSendDraft({
      family: "evm",
      chainId: 1,
      fromAddress: "0x0000000000000000000000000000000000000000",
      toAddress: "0x0000000000000000000000000000000000000001",
      asset: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "0.01",
      balance: {
        family: "evm",
        chainId: 1,
        type: "native",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: "1000000000000000000",
        balanceFormatted: "1",
      },
    });

    expect(draft.supportStatus).toBe("supported");
    expect(draft.canProceed).toBe(true);
  });

  it("returns coming soon for Solana draft", async () => {
    const draft = await createUniversalSendDraft({
      family: "solana",
      chainId: 101,
      fromAddress: "11111111111111111111111111111111",
      toAddress: "11111111111111111111111111111111",
      asset: {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
      },
      amountFormatted: "0.1",
      balance: {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
        balanceRaw: "1000000000",
        balanceFormatted: "1",
      },
    });

    expect(draft.supportStatus).toBe("coming_soon");
    expect(draft.canBroadcast).toBe(false);
  });
});
