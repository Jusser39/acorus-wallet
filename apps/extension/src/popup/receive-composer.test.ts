import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("popup receive composer", () => {
  it("filters receive addresses by selected network family", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/popup/index.ts"),
      "utf8",
    );

    expect(source).toContain("renderReceiveAddressRows");
    expect(source).toContain("profile.chainFamily === family");
    expect(source).toContain("Coming soon");
    expect(source).toContain("data-copy");
    expect(source).toContain("wireReceiveNetworkSelector");
    expect(source).toContain("box.innerHTML = renderReceiveAddressRows");
  });

  it("contains network search/filter wiring", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/popup/index.ts"),
      "utf8",
    );

    expect(source).toContain("wireNetworkSearch");
    expect(source).toContain("filterNetworkCards");
    expect(source).toContain("data-network-name");
    expect(source).toContain("card.hidden = Boolean(query)");
  });

  it("renders safe add-chain and watch-asset approval cards without raw JSON", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/popup/index.ts"),
      "utf8",
    );

    expect(source).toContain("renderApprovalDetailCard");
    expect(source).toContain("Add Network");
    expect(source).toContain("Watch Asset");
    expect(source).toContain("multichain_send");
    expect(source).toContain("Send ${escapeHtml(details.assetSymbol)}");
    expect(source).toContain("details.tokenAddress");
    expect(source).toContain("details.ataWarning");
    expect(source).toContain("rpcHostname");
    expect(source).not.toContain("JSON.stringify(request");
  });

  it("contains a gated Solana send composer", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/popup/index.ts"),
      "utf8",
    );

    expect(source).toContain("solana-send-form");
    expect(source).toContain("send-asset");
    expect(source).toContain("getSolanaSendAssets");
    expect(source).toContain("queue_solana_send");
    expect(source).toContain("family === \"solana\"");
    expect(source).toContain("SOL and SPL sends are queued");
    expect(source).toContain("assetType: assetOption?.dataset.assetType");
  });

  it("contains gated EVM 0x swap approval and execution controls", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/popup/index.ts"),
      "utf8",
    );

    expect(source).toContain("evm-swap-form");
    expect(source).toContain("fetchEvmSwapQuote");
    expect(source).toContain("/api/swap/evm/0x/quote");
    expect(source).toContain("queue_evm_approve_token");
    expect(source).toContain("queue_evm_swap_approval");
    expect(source).toContain("0x quotes are loaded through the Acorus backend");
    expect(source).toContain("Review swap");
  });

  it("renders token approval and 0x swap approval cards without raw calldata labels", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/popup/index.ts"),
      "utf8",
    );

    expect(source).toContain("details?.kind === \"token_approval\"");
    expect(source).toContain("details?.kind === \"evm_swap\"");
    expect(source).toContain("Approve ${escapeHtml(details.tokenSymbol)}");
    expect(source).toContain("0x Swap");
    expect(source).not.toContain("<dt>Data</dt>");
  });
});
