import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnonymousUser } from "./api";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses same-origin API paths by default", async () => {
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
});
