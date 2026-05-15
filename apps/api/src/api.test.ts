import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { MemoryStore } from "./memory-store";
import type { FastifyInstance } from "fastify";

describe("api", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns healthcheck", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", store: "memory" });
  });

  it("creates anonymous user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users/anonymous",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBeTruthy();
  });

  it("rejects sensitive fields on anonymous user route", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users/anonymous",
      payload: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "sensitive_fields_forbidden",
    });
  });

  it("does not leak parser errors for empty json bodies", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/users/anonymous",
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "bad_request",
    });
  });

  it("creates wallet profile with public address", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;
    const response = await app.inject({
      method: "POST",
      url: "/api/wallet-profiles",
      payload: {
        userId,
        name: "Main wallet",
        type: "local",
        publicAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        chainFamily: "evm",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().publicAddress).toBe(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    );
  });

  it("rejects sensitive fields on wallet profile creation", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;
    const response = await app.inject({
      method: "POST",
      url: "/api/wallet-profiles",
      payload: {
        userId,
        name: "Main wallet",
        type: "local",
        publicAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        chainFamily: "evm",
        privateKey: "0xdeadbeef",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "sensitive_fields_forbidden",
    });
  });

  it("supports contacts CRUD", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;
    const created = await app.inject({
      method: "POST",
      url: "/api/contacts",
      payload: {
        userId,
        name: "Alice",
        address: "0x1111111111111111111111111111111111111111",
        chainFamily: "evm",
      },
    });
    const contactId = created.json().id as string;
    const listed = await app.inject({
      method: "GET",
      url: `/api/contacts?userId=${userId}`,
    });
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/contacts/${contactId}`,
      payload: {
        userId,
        name: "Alice Updated",
        address: "0x1111111111111111111111111111111111111111",
        chainFamily: "evm",
        note: "Friend",
      },
    });
    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/contacts/${contactId}?userId=${userId}`,
    });

    expect(created.statusCode).toBe(200);
    expect(listed.json().items).toHaveLength(1);
    expect(updated.json().name).toBe("Alice Updated");
    expect(deleted.statusCode).toBe(204);
  });

  it("supports transactions CRUD", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;
    const wallet = await app.inject({
      method: "POST",
      url: "/api/wallet-profiles",
      payload: {
        userId,
        name: "Practice",
        type: "practice",
        publicAddress: "practice-wallet",
        chainFamily: "evm",
      },
    });
    const walletId = wallet.json().id as string;
    const created = await app.inject({
      method: "POST",
      url: "/api/transactions",
      payload: {
        userId,
        walletProfileId: walletId,
        chainId: 1,
        hash: "practice-tx-1",
        from: "practice-wallet",
        to: "0x2222222222222222222222222222222222222222",
        assetType: "practice",
        symbol: "ETH",
        amount: "1.23",
        status: "confirmed",
        direction: "out",
        submittedAt: new Date().toISOString(),
      },
    });
    const txId = created.json().id as string;
    const listed = await app.inject({
      method: "GET",
      url: `/api/transactions?userId=${userId}&walletProfileId=${walletId}`,
    });
    const refreshed = await app.inject({
      method: "PATCH",
      url: `/api/transactions/${txId}/status`,
      payload: { userId },
    });

    expect(created.statusCode).toBe(200);
    expect(listed.json().items).toHaveLength(1);
    expect(refreshed.json().status).toBe("confirmed");
  });

  it("returns curated token list endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/tokens?chainId=1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items.some((item: { symbol: string }) => item.symbol === "USDT")).toBe(true);
  });

  it("returns chains endpoint with solana support", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/chains",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ chainId: 101, family: "solana", nativeSymbol: "SOL" }),
      ]),
    );
  });

  it("market prices returns sourceStatus on fresh cache", async () => {
    // First call – no cache → live (mock mode) → sourceStatus fallback_mock or live
    const res1 = await app.inject({
      method: "GET",
      url: "/api/market/prices?chainId=1&currency=USD&symbols=ETH",
    });
    expect(res1.statusCode).toBe(200);
    const body1 = res1.json() as { ok: boolean; prices: Array<{ sourceStatus?: string }> };
    expect(body1.ok).toBe(true);
    expect(body1.prices.length).toBeGreaterThan(0);
    expect(body1.prices[0]?.sourceStatus).toBeTruthy();

    // Second call – should hit cache with sourceStatus: "cached"
    const res2 = await app.inject({
      method: "GET",
      url: "/api/market/prices?chainId=1&currency=USD&symbols=ETH",
    });
    expect(res2.statusCode).toBe(200);
    const body2 = res2.json() as { ok: boolean; prices: Array<{ sourceStatus?: string }> };
    expect(body2.prices[0]?.sourceStatus).toBe("cached");
  });

  it("market prices returns empty array for no symbols", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/market/prices?chainId=1&currency=USD",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, prices: [] });
  });

  it("market chart returns cache-first sourceStatus", async () => {
    const first = await app.inject({
      method: "GET",
      url: "/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=7D",
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      ok: true,
      chart: {
        sourceStatus: expect.any(String),
      },
    });

    const second = await app.inject({
      method: "GET",
      url: "/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=7D",
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      ok: true,
      chart: {
        sourceStatus: "cached",
      },
    });
  });

  it("discover-token returns ok:true with null-or-object", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/market/discover-token?chainId=1&tokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; discovery: unknown };
    expect(body.ok).toBe(true);
    // discovery is either a valid object or null — never an error payload
    if (body.discovery !== null) {
      expect(body.discovery).toMatchObject({ chainId: 1, tokenAddress: expect.any(String) });
    }
  });

  it("creates user token with enriched market fields", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;

    const res = await app.inject({
      method: "POST",
      url: "/api/user-tokens",
      payload: {
        userId,
        chainId: 1,
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        isCustom: true,
        sourceStatus: "live",
        liquidityUsd: 50000000,
        volume24hUsd: 10000000,
        marketCapUsd: 24000000000,
        fdvUsd: 24000000000,
        pairUrl: "https://dexscreener.com/ethereum/usdc",
        riskLevel: "low",
        riskFlagsJson: "[]",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; token: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.token.symbol).toBe("USDC");
    expect(body.token.liquidityUsd).toBe(50000000);
    expect(body.token.riskLevel).toBe("low");
    expect(body.token.sourceStatus).toBe("live");
  });

  it("supports hide and unhide token overrides", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;

    const hide = await app.inject({
      method: "POST",
      url: "/api/user-tokens/hide",
      payload: {
        userId,
        chainId: 1,
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        isCustom: false,
      },
    });

    expect(hide.statusCode).toBe(200);
    expect(hide.json()).toMatchObject({
      ok: true,
      token: {
        isHidden: true,
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      },
    });

    const unhide = await app.inject({
      method: "POST",
      url: "/api/user-tokens/unhide",
      payload: {
        userId,
        chainId: 1,
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    });

    expect(unhide.statusCode).toBe(200);
    expect(unhide.json()).toMatchObject({
      ok: true,
      token: {
        isHidden: false,
      },
    });
  });

  it("stores onboarding progress", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;

    const created = await app.inject({
      method: "POST",
      url: "/api/onboarding-progress",
      payload: {
        userId,
        step: "practice_intro",
        completed: true,
      },
    });
    const listed = await app.inject({
      method: "GET",
      url: `/api/onboarding-progress?userId=${userId}`,
    });

    expect(created.statusCode).toBe(200);
    expect(created.json().step).toBe("practice_intro");
    expect(listed.json().items).toHaveLength(1);
  });

  it("preserves case-sensitive solana token addresses", async () => {
    const user = await app.inject({ method: "POST", url: "/api/users/anonymous" });
    const userId = user.json().id as string;

    const created = await app.inject({
      method: "POST",
      url: "/api/user-tokens",
      payload: {
        userId,
        chainId: 101,
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        isCustom: true,
      },
    });

    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      ok: true,
      token: {
        chainId: 101,
        tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      },
    });
  });
});
