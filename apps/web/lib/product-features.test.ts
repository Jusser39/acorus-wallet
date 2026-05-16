import { describe, expect, it } from "vitest";
import {
  WALLET_ACTION_FEATURES,
  getFeatureStatusLabel,
} from "./product-features";

describe("product features", () => {
  it("includes core wallet actions", () => {
    const ids = WALLET_ACTION_FEATURES.map((feature) => feature.id);

    expect(ids).toContain("send");
    expect(ids).toContain("receive");
    expect(ids).toContain("swap");
    expect(ids).toContain("explore");
    expect(ids).toContain("security");
    expect(ids).toContain("extension");
  });

  it("labels statuses", () => {
    expect(getFeatureStatusLabel("live")).toBe("Live");
    expect(getFeatureStatusLabel("preview")).toBe("Preview");
    expect(getFeatureStatusLabel("planned")).toBe("Planned");
    expect(getFeatureStatusLabel("disabled")).toBe("Disabled");
  });
});
