import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExtensionSmokeClient } from "./extension-smoke-client";

describe("ExtensionSmokeClient", () => {
  it("renders without an injected provider", () => {
    render(<ExtensionSmokeClient />);

    expect(screen.getByText("Manual dApp provider harness")).toBeTruthy();
    expect(screen.getByText("window.ethereum")).toBeTruthy();
    expect(screen.getAllByText("missing").length).toBeGreaterThan(0);
  });
});
