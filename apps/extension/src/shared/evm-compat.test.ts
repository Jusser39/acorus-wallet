import { describe, expect, it } from "vitest";
import {
  EVM_COMPATIBILITY_METHODS,
  coerceEvmAccounts,
  formatEvmChainId,
  getEvmSelectedAccount,
  isEvmCompatibilityMethod,
  mapEvmMethodToAcorusMethod,
  parseEvmSwitchChainParameter,
  toNetVersion,
} from "./evm-compat";

describe("evm compatibility helpers", () => {
  it("recognizes supported ethereum compatibility methods", () => {
    expect(isEvmCompatibilityMethod("eth_requestAccounts")).toBe(true);
    expect(isEvmCompatibilityMethod("wallet_switchEthereumChain")).toBe(true);
    expect(isEvmCompatibilityMethod("acorus_requestAccounts")).toBe(false);
    expect(EVM_COMPATIBILITY_METHODS).toContain("personal_sign");
    expect(EVM_COMPATIBILITY_METHODS).toContain("wallet_watchAsset");
    expect(EVM_COMPATIBILITY_METHODS).toContain("web3_clientVersion");
  });

  it("maps compatibility methods to acorus bridge methods", () => {
    expect(mapEvmMethodToAcorusMethod("eth_requestAccounts")).toBe(
      "acorus_requestAccounts",
    );
    expect(mapEvmMethodToAcorusMethod("eth_signTypedData_v4")).toBe(
      "acorus_signTypedData",
    );
    expect(mapEvmMethodToAcorusMethod("wallet_addEthereumChain")).toBe(
      "acorus_addChain",
    );
    expect(mapEvmMethodToAcorusMethod("wallet_getPermissions")).toBe(
      "acorus_getPermissions",
    );
    expect(mapEvmMethodToAcorusMethod("web3_clientVersion")).toBe(
      "acorus_chainId",
    );
  });

  it("formats chain ids for ethereum consumers", () => {
    expect(formatEvmChainId(1)).toBe("0x1");
    expect(formatEvmChainId("137")).toBe("0x89");
    expect(formatEvmChainId("0x2105")).toBe("0x2105");
    expect(toNetVersion("0x2105")).toBe("8453");
  });

  it("parses wallet_switchEthereumChain payloads", () => {
    expect(parseEvmSwitchChainParameter([{ chainId: "0x89" }])).toBe(137);
    expect(parseEvmSwitchChainParameter([{ chainId: "8453" }])).toBe(8453);
    expect(parseEvmSwitchChainParameter(["0x1"])).toBe(1);
    expect(parseEvmSwitchChainParameter(undefined)).toBeNull();
  });

  it("coerces account payloads safely", () => {
    expect(coerceEvmAccounts(["0xabc", 123, null])).toEqual(["0xabc"]);
    expect(getEvmSelectedAccount(["0xabc", "0xdef"])).toBe("0xabc");
    expect(getEvmSelectedAccount("0xabc")).toBeNull();
  });
});
