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
});
