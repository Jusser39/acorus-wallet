import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("universal swap review UI", () => {
  it("queues universal route reviews through the Acorus extension without exposing provider labels in the UI", async () => {
    const source = await readFile(
      resolve(process.cwd(), "components/swap-composer.tsx"),
      "utf8",
    );

    expect(source).toContain("requestExtensionUniversalSwap");
    expect(source).toContain("Review route in extension");
    expect(source).not.toContain("Review Jupiter route in extension");
    expect(source).not.toContain("Review Rango route in extension");
    expect(source).toContain("acorus_backend_jupiter");
    expect(source).toContain("acorus_backend_rango");
    expect(source).toContain("executionStatus: \"review_only\"");
  });
});
