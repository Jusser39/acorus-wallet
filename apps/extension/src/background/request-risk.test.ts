import { describe, expect, it } from "vitest";
import { buildApprovalRiskWarning } from "./request-risk";

describe("buildApprovalRiskWarning", () => {
  it("flags unlimited erc20 approvals", () => {
    const warning = buildApprovalRiskWarning({
      method: "acorus_sendTransaction",
      params: [
        {
          to: "0x1111111111111111111111111111111111111111",
          data:
            "0x095ea7b30000000000000000000000002222222222222222222222222222222222222222ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        },
      ],
    });

    expect(warning).toContain("unlimited token allowance");
    expect(warning).toContain("0x2222…2222");
  });

  it("flags nft operator approvals", () => {
    const warning = buildApprovalRiskWarning({
      method: "acorus_sendTransaction",
      params: [
        {
          to: "0x3333333333333333333333333333333333333333",
          data:
            "0xa22cb46500000000000000000000000044444444444444444444444444444444444444440000000000000000000000000000000000000000000000000000000000000001",
        },
      ],
    });

    expect(warning).toContain("setApprovalForAll");
    expect(warning).toContain("0x4444…4444");
  });

  it("adds typed data context when available", () => {
    const warning = buildApprovalRiskWarning({
      method: "acorus_signTypedData",
      params: [
        {
          domain: {
            name: "Permit2",
            verifyingContract: "0x5555555555555555555555555555555555555555",
          },
          primaryType: "PermitTransferFrom",
        },
      ],
    });

    expect(warning).toContain("PermitTransferFrom");
    expect(warning).toContain("Permit2");
    expect(warning).toContain("0x5555…5555");
  });
});
