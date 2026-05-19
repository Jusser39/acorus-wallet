import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExtensionSmokeClient } from "./extension-smoke-client";

describe("ExtensionSmokeClient", () => {
  it("renders without an injected provider", () => {
    render(<ExtensionSmokeClient />);

    expect(screen.getByText("Manual dApp provider harness")).toBeTruthy();
    expect(screen.getByText("window.ethereum")).toBeTruthy();
    expect(screen.getByText("Solana diagnostics")).toBeTruthy();
    expect(screen.getByText("Solana connect")).toBeTruthy();
    expect(screen.getByText("Event log")).toBeTruthy();
    expect(screen.getByText("Copy diagnostics")).toBeTruthy();
    expect(screen.getByText("Clear log")).toBeTruthy();
    expect(screen.getByText("Protocol")).toBeTruthy();
    expect(screen.getAllByText("missing").length).toBeGreaterThan(0);
  });
});
