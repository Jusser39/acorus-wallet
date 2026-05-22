import { createDemoDappShellSnapshot } from "@acorus/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDappShellState, setDappShellState } from "./permission-store";

const storage = new Map<string, unknown>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        async get(keys?: string | string[] | Record<string, unknown> | null) {
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, storage.get(key)]));
          }

          if (typeof keys === "string") {
            return { [keys]: storage.get(keys) };
          }

          return Object.fromEntries(storage.entries());
        },
        async set(items: Record<string, unknown>) {
          for (const [key, value] of Object.entries(items)) {
            storage.set(key, value);
          }
        },
      },
    },
  });
});

describe("extension permission store", () => {
  it("starts with no demo proposals or sign prompts", async () => {
    const state = await getDappShellState();

    expect(state.proposals).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.pendingRequests).toEqual([]);
  });

  it("removes old demo preview requests from stored extension state", async () => {
    await setDappShellState(createDemoDappShellSnapshot());

    const state = await getDappShellState();

    expect(state.proposals).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.pendingRequests).toEqual([]);
  });
});
