import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("content inpage injection", () => {
  it("does not inject the inpage script because manifest MAIN world owns it", async () => {
    const source = await readFile(
      resolve(process.cwd(), "src/content/index.ts"),
      "utf8",
    );

    expect(source).not.toContain("injectInpageProvider");
    expect(source).not.toContain("document.createElement(\"script\")");
  });
});
