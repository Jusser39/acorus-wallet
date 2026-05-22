import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DappShellSnapshot } from "@acorus/shared";
import { listWatchedAssets } from "./extension-assets";
import { listExtensionNetworks } from "./extension-chain-registry";

const storage = new Map<string, unknown>();
const origin = "https://swap.demo.acorus.app";

beforeEach(() => {
  storage.clear();
  vi.restoreAllMocks();
  vi.stubGlobal("chrome", {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      getURL: (path: string) => `chrome-extension://acorus/${path}`,
    },
    storage: {
      onChanged: { addListener: vi.fn() },
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
    windows: {
      create: vi.fn(),
    },
  });
});

describe("extension approval stabilization", () => {
  it("queues wallet_addEthereumChain and does not persist before approval", async () => {
    const { handleRuntimeMessage } = await import("./index");

    void handleRuntimeMessage(providerMessage("acorus_addChain", [customChainPayload()]), {});
    await waitForPendingRequest("add_chain");

    const networks = await listExtensionNetworks();
    expect(networks.some((network) => network.chainId === 9999)).toBe(false);
  });

  it("rejects queued addChain requests with user_rejected", async () => {
    const { handleRuntimeMessage } = await import("./index");

    const providerPromise = handleRuntimeMessage(
      providerMessage("acorus_addChain", [customChainPayload()]),
      {},
    );
    const request = await waitForPendingRequest("add_chain");
    await handleRuntimeMessage({
      kind: "reject_request",
      requestId: "reject_add_chain",
      surface: "popup",
      requestIdTarget: request.id,
    }, {});

    await expect(providerPromise).resolves.toMatchObject({
      ok: false,
      error: {
        code: "user_rejected",
      },
    });
  });

  it("approves addChain after RPC validation and persists the network", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: "0x270f" }),
    })));
    const { handleRuntimeMessage } = await import("./index");

    const providerPromise = handleRuntimeMessage(
      providerMessage("acorus_addChain", [customChainPayload()]),
      {},
    );
    const request = await waitForPendingRequest("add_chain");
    await handleRuntimeMessage({
      kind: "approve_request",
      requestId: "approve_add_chain",
      surface: "popup",
      requestIdTarget: request.id,
    }, {});

    await expect(providerPromise).resolves.toMatchObject({ ok: true });
    expect((await listExtensionNetworks()).some((network) => network.chainId === 9999)).toBe(true);
  });

  it("queues wallet_watchAsset and does not persist before approval", async () => {
    const { handleRuntimeMessage } = await import("./index");

    void handleRuntimeMessage(providerMessage("acorus_watchAsset", [watchAssetPayload()]), {});
    await waitForPendingRequest("watch_asset");

    expect(await listWatchedAssets()).toEqual([]);
  });

  it("contains Solana send approval queue and live execution hook", async () => {
    const source = await readFile(resolve(process.cwd(), "src/background/index.ts"), "utf8");

    expect(source).toContain("queue_solana_send");
    expect(source).toContain("queueInternalSolanaSendRequest");
    expect(source).toContain("kind: \"multichain_send\"");
    expect(source).toContain("buildSplTransferDraft");
    expect(source).toContain("assetType === \"spl\"");
    expect(source).toContain("ataWarning");
    expect(source).toContain("executeExtensionSolanaSend");
    expect(source).toContain("pendingProviderExecutions.set");
  });

  it("contains review-only universal swap approval for Jupiter and Rango", async () => {
    const source = await readFile(resolve(process.cwd(), "src/background/index.ts"), "utf8");

    expect(source).toContain("queue_universal_swap_approval");
    expect(source).toContain("queueInternalUniversalSwapRequest");
    expect(source).toContain("acorus_backend_jupiter");
    expect(source).toContain("acorus_backend_rango");
    expect(source).toContain("executionStatus: \"review_only\"");
    expect(source).toContain("payload.provider !== \"0x\"");
    expect(source).toContain("createApprovedPreviewDappResult(request, approvedAt)");
  });
});

function providerMessage(method: "acorus_addChain" | "acorus_watchAsset", params: unknown[]) {
  return {
    kind: "provider_request",
    requestId: `request_${method}_${Date.now()}`,
    surface: "content",
    origin,
    method,
    params,
  } as const;
}

function customChainPayload() {
  return {
    chainId: "0x270f",
    chainName: "Acorus Testnet",
    nativeCurrency: {
      name: "Acorus",
      symbol: "ACR",
      decimals: 18,
    },
    rpcUrls: ["https://rpc.example.test"],
    blockExplorerUrls: ["https://explorer.example.test"],
  };
}

function watchAssetPayload() {
  return {
    type: "ERC20",
    options: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      decimals: 6,
    },
  };
}

async function waitForPendingRequest(kind: "add_chain" | "watch_asset") {
  for (let index = 0; index < 20; index += 1) {
    const snapshot = storage.get("acorus_dapp_shell_state") as DappShellSnapshot | undefined;
    const request = snapshot?.pendingRequests.find((item) => item.kind === kind);

    if (request) {
      return request;
    }

    await Promise.resolve();
  }

  throw new Error(`Pending request ${kind} was not queued.`);
}
