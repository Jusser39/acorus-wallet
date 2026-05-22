import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("design system smoke page", () => {
  it("renders the premium Acorus component catalog", async () => {
    const source = await readFile(resolve(process.cwd(), "app/design-system/page.tsx"), "utf8");

    expect(source).toContain("Acorus design system");
    expect(source).toContain("Premium white and violet wallet shell");
    expect(source).toContain("Primary action");
    expect(source).toContain("Network Pills");
    expect(source).toContain("Review 0x swap");
  });
});
