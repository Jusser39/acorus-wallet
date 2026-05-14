import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

describe("logger redaction", () => {
  it("redacts sensitive fields", () => {
    let output = "";
    const destination = {
      write(chunk: string) {
        output += chunk;
      },
    };
    const logger = createLogger(
      {
        level: "info",
        timestamp: false,
      },
      destination as never,
    );

    logger.info({
      mnemonic: "seed words here",
      passcode: "123456",
      nested: {
        privateKey: "0xabc",
      },
    });

    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("seed words here");
    expect(output).not.toContain("123456");
    expect(output).not.toContain("0xabc");
  });
});
