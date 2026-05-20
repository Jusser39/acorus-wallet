import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnonymousUser, fetchExploreTop, hideUserToken } from "./api";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses same-origin API paths by default", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "user-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await createAnonymousUser();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/anonymous",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });

  it("uses internal API URL during server rendering", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubEnv("INTERNAL_API_URL", "http://api:4000/");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "user-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await createAnonymousUser();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api:4000/api/users/anonymous",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });

  it("posts hide token requests to the same-origin API", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, token: { id: "token-1" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await hideUserToken({
      userId: "user-1",
      chainId: 1,
      tokenAddress: "0x1234",
      symbol: "TEST",
      name: "Test Token",
      decimals: 18,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user-tokens/hide",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });

  it("requests paged explore feeds by view", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, section: "gainers", items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await fetchExploreTop({ view: "gainers", page: 2, limit: 12 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/explore/top?view=gainers&page=2&limit=12",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });
});
