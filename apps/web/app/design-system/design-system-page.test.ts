import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("design system smoke page", () => {
  it("renders the magic glass Acorus component catalog", async () => {
    const source = await readFile(resolve(process.cwd(), "app/design-system/page.tsx"), "utf8");

    expect(source).toContain("Acorus Magic Glass");
    expect(source).toContain("Unlock state");
    expect(source).toContain("Wallet dashboard");
    expect(source).toContain("Swap panel");
    expect(source).toContain("Approval review");
  });
});
