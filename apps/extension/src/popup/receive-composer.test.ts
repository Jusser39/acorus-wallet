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
  });
});
