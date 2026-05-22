import { beforeEach, describe, expect, it } from "vitest";
import { clearAcorusLocalWalletState } from "./reset-local-wallet";

describe("clearAcorusLocalWalletState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("removes Acorus wallet state and keeps unrelated app storage", () => {
    window.localStorage.setItem("acorus.encryptedVault", "vault");
    window.localStorage.setItem("acorus.vaultMeta", "meta");
    window.localStorage.setItem("acorus.userId", "user");
    window.localStorage.setItem("acorus_wallet_legacy", "legacy");
    window.localStorage.setItem("theme", "light");

    const removed = clearAcorusLocalWalletState(window.localStorage);

    expect(removed.sort()).toEqual([
      "acorus.encryptedVault",
      "acorus.userId",
      "acorus.vaultMeta",
      "acorus_wallet_legacy",
    ]);
    expect(window.localStorage.getItem("theme")).toBe("light");
  });
});
