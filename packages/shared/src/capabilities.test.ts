import { describe, expect, it } from "vitest";
import {
  getCapabilityStatus,
  getChainCapabilityProfile,
  summarizeCapabilityProfile,
} from "./capabilities";

describe("universal capability matrix", () => {
  it("marks EVM core wallet operations as live", () => {
    const profile = getChainCapabilityProfile({ family: "evm", chainId: 1 });

    expect(getCapabilityStatus(profile, "receive")).toBe("live");
    expect(getCapabilityStatus(profile, "send_native")).toBe("live");
    expect(getCapabilityStatus(profile, "send_token")).toBe("live");
    expect(getCapabilityStatus(profile, "swap")).toBe("preview");
  });

  it("keeps Tron in preview/planned mode without pretending live balances", () => {
    const profile = getChainCapabilityProfile({ family: "tron" });

    expect(profile.chainId).toBe("tron-mainnet");
    expect(getCapabilityStatus(profile, "receive")).toBe("live");
    expect(getCapabilityStatus(profile, "native_balance")).toBe("planned");
    expect(getCapabilityStatus(profile, "send_native")).toBe("preview");
  });

  it("blocks token/NFT semantics for UTXO chains", () => {
    const profile = getChainCapabilityProfile({ family: "utxo" });

    expect(getCapabilityStatus(profile, "send_token")).toBe("blocked");
    expect(getCapabilityStatus(profile, "send_nft")).toBe("blocked");
  });

  it("summarizes statuses for product dashboards", () => {
    const summary = summarizeCapabilityProfile(getChainCapabilityProfile({ family: "evm" }));

    expect(summary.live).toBeGreaterThan(0);
    expect(summary.preview).toBeGreaterThan(0);
  });
});
