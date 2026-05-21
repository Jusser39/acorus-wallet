import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { readEnv } from "./env";
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
    vi.unstubAllGlobals();
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
        expect.objectContaining({ chainId: "tron-mainnet", family: "tron", isSkeleton: true }),
        expect.objectContaining({ chainId: "bitcoin-mainnet", family: "utxo", isSkeleton: true }),
      ]),
    );
  });

  it("market supports SOL prices and charts", async () => {
    const priceResponse = await app.inject({
      method: "GET",
      url: "/api/market/prices?chainId=101&currency=USD&symbols=SOL",
    });

    expect(priceResponse.statusCode).toBe(200);
    const priceBody = priceResponse.json() as { prices: Array<{ source?: string; sourceStatus?: string }> };
    expect(priceBody.prices.every((price) => price.source !== "mock" && price.sourceStatus !== "fallback_mock")).toBe(true);

    const chartResponse = await app.inject({
      method: "GET",
      url: "/api/market/chart?chainId=101&currency=USD&symbol=SOL&range=1W",
    });

    expect(chartResponse.statusCode).toBe(200);
    const chartBody = chartResponse.json() as { chart: { sourceStatus?: string; points: unknown[] } };
    expect(chartBody.chart.sourceStatus).not.toBe("fallback_mock");
  }, 30_000);

  it("market prices returns sourceStatus on fresh cache", async () => {
    // First call: live if the provider is reachable, otherwise honest empty data.
    const res1 = await app.inject({
      method: "GET",
      url: "/api/market/prices?chainId=1&currency=USD&symbols=ETH",
    });
    expect(res1.statusCode).toBe(200);
    const body1 = res1.json() as { ok: boolean; prices: Array<{ sourceStatus?: string }> };
    expect(body1.ok).toBe(true);
    expect(body1.prices.every((price) => price.sourceStatus !== "fallback_mock")).toBe(true);

    // Second call – should hit cache with sourceStatus: "cached"
    const res2 = await app.inject({
      method: "GET",
      url: "/api/market/prices?chainId=1&currency=USD&symbols=ETH",
    });
    expect(res2.statusCode).toBe(200);
    const body2 = res2.json() as { ok: boolean; prices: Array<{ sourceStatus?: string }> };
    if (body1.prices.length > 0) {
      expect(body2.prices[0]?.sourceStatus).toBe("cached");
    } else {
      expect(body2.prices).toEqual([]);
    }
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
      url: "/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=1W",
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
      url: "/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=1W",
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      ok: true,
      chart: {
        sourceStatus: "cached",
      },
    });
  });

  it("returns canonical token detail and coin chart fallbacks by CoinGecko id", async () => {
    const detail = await app.inject({
      method: "GET",
      url: "/api/market/token-detail?coinId=ripple&currency=USD",
    });
    const chart = await app.inject({
      method: "GET",
      url: "/api/market/coin-chart?coinId=ripple&currency=USD&range=1M",
    });

    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({
      ok: true,
      detail: {
        id: "ripple",
      },
    });
    expect(chart.statusCode).toBe(200);
    expect(chart.json().chart.range).toBe("1M");
    expect(["live", "unavailable"]).toContain(chart.json().chart.sourceStatus);
    if (chart.json().chart.sourceStatus === "live") {
      expect(chart.json().chart.points.length).toBeGreaterThan(1);
    } else {
      expect(chart.json().chart.points).toEqual([]);
    }
  });

  it("searches tokens pools and wallet-shaped addresses without secrets", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/market/search?query=0x0000000000000000000000000000000000000001",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().results[0]).toMatchObject({
      kind: "wallet",
      subtitle: "EVM wallet address",
    });
  });

  it("market chart accepts token-page intervals", async () => {
    for (const range of ["1H", "1D", "1W", "1M", "1Y", "ALL"]) {
      const res = await app.inject({
        method: "GET",
        url: `/api/market/chart?chainId=1&currency=USD&symbol=ETH&range=${range}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        ok: true,
        chart: {
          range,
          points: expect.any(Array),
        },
      });
      expect(["live", "cached", "unavailable"]).toContain(res.json().chart.sourceStatus);
      if (res.json().chart.sourceStatus !== "unavailable") {
        expect(res.json().chart.points.length).toBeGreaterThan(0);
      }
    }
  }, 15_000);

  it("does not expose mock prices or mock charts from public market endpoints", async () => {
    const top = await app.inject({
      method: "GET",
      url: "/api/explore/top?view=top&limit=10",
    });
    expect(top.statusCode).toBe(200);
    expect(JSON.stringify(top.json())).not.toContain('"source":"mock"');

    const chart = await app.inject({
      method: "GET",
      url: "/api/market/coin-chart?coinId=the-open-network&currency=USD&range=ALL",
    });
    expect(chart.statusCode).toBe(200);
    expect(JSON.stringify(chart.json())).not.toContain("fallback_mock");
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

  it("POST /api/swap/quote returns mock quote", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/swap/quote",
      payload: {
        from: {
          family: "evm",
          chainId: 1,
          type: "native",
          symbol: "ETH",
          name: "Ethereum",
          decimals: 18,
          tokenAddress: null,
          isVerified: true,
        },
        to: {
          family: "evm",
          chainId: 1,
          type: "erc20",
          symbol: "USDC",
          name: "USD Coin",
          decimals: 6,
          tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          isVerified: true,
        },
        amountFormatted: "1",
        slippageBps: 50,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.ok).toBe(true);
    expect(body.quote.status).toBe("quoted");
    expect(body.quote.provider).toBe("mock");
  });

  it("POST /api/swap/quote rejects sensitive fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/swap/quote",
      payload: {
        mnemonic: "test test test",
        from: {},
        to: {},
        amountFormatted: "1",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("sensitive_fields_not_allowed");
  });

  it("GET /api/swap/evm/0x/price returns 503 without API key", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/swap/evm/0x/price?chainId=1&sellToken=ETH&buyToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&sellAmount=1000000000000000&taker=0x0000000000000000000000000000000000000001",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error).toBe("swap_provider_not_configured");
  });

  it("GET /api/swap/evm/status does not expose API key", async () => {
    await app.close();
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        ZEROX_ENABLED: "true",
        ZEROX_API_KEY: "test-secret-key",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/evm/status",
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).not.toContain("test-secret-key");
    expect(response.json()).toMatchObject({
      provider: "0x",
      configured: true,
    });
  });

  it("GET /api/swap/evm/0x/price sends API key server-side and maps response", async () => {
    await app.close();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      sellAmount: "1000000000000000",
      buyAmount: "2500000",
      price: "2500",
      liquidityAvailable: true,
      allowanceTarget: "0x00000000000000000000000000000000000000aa",
      route: {
        fills: [{ source: "Uniswap_V3", proportionBps: "10000" }],
      },
      zid: "quote-id",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        ZEROX_ENABLED: "true",
        ZEROX_API_KEY: "test-secret-key",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/evm/0x/price?chainId=1&sellToken=ETH&buyToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&sellAmount=1000000000000000&taker=0x0000000000000000000000000000000000000001",
    });

    expect(response.statusCode).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("sellToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    expect(String(url)).not.toContain("sellToken=ETH");
    expect(String(url)).toContain("buyToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(String(url)).not.toContain("swapFeeBps=0");
    expect((init as RequestInit).headers).toMatchObject({
      "0x-api-key": "test-secret-key",
      "0x-version": "v2",
    });
    expect(JSON.stringify(response.json())).not.toContain("test-secret-key");
    expect(response.json()).toMatchObject({
      provider: "0x",
      mode: "price",
      buyAmountRaw: "2500000",
      routeSummary: {
        label: "Uniswap_V3",
      },
    });
  });

  it("GET /api/swap/evm/0x/price omits empty affiliate fee params", async () => {
    await app.close();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      sellAmount: "1000000000000000",
      buyAmount: "2500000",
      price: "2500",
      liquidityAvailable: true,
      route: {
        fills: [{ source: "Uniswap_V3", proportionBps: "10000" }],
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        ZEROX_ENABLED: "true",
        ZEROX_API_KEY: "test-secret-key",
        ZEROX_AFFILIATE_FEE_BPS: "",
        ZEROX_FEE_RECIPIENT: "",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/evm/0x/price?chainId=1&sellToken=native&buyToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&sellAmount=1000000000000000&taker=0x0000000000000000000000000000000000000001",
    });

    expect(response.statusCode).toBe(200);
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain("swapFeeBps");
    expect(String(url)).not.toContain("swapFeeRecipient");
  });

  it("GET /api/swap/evm/0x/quote maps transaction without leaking key", async () => {
    await app.close();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      sellAmount: "1000000",
      buyAmount: "999000",
      minBuyAmount: "990000",
      price: "0.999",
      transaction: {
        to: "0x00000000000000000000000000000000000000bb",
        data: "0xabcdef",
        value: "0",
        gas: "140000",
      },
      issues: {
        allowance: {
          spender: "0x00000000000000000000000000000000000000aa",
          actual: "0",
          expected: "1000000",
        },
      },
      route: { fills: [{ source: "0x_RFQ", proportionBps: "10000" }] },
      zid: "firm-quote",
    }), { status: 200 })));
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        ZEROX_ENABLED: "true",
        ZEROX_API_KEY: "test-secret-key",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/evm/0x/quote?chainId=1&sellToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&buyToken=ETH&sellAmount=1000000&taker=0x0000000000000000000000000000000000000001",
    });

    expect(response.statusCode).toBe(200);
    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain("sellToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    expect(String(url)).toContain("buyToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    expect(String(url)).not.toContain("buyToken=ETH");
    expect(response.json()).toMatchObject({
      provider: "0x",
      mode: "quote",
      to: "0x00000000000000000000000000000000000000bb",
      approvalRequired: true,
      approval: {
        spender: "0x00000000000000000000000000000000000000aa",
      },
    });
    expect(JSON.stringify(response.json())).not.toContain("test-secret-key");
  });

  it("GET /api/swap/evm/0x/price rejects invalid taker token and amount", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/swap/evm/0x/price?chainId=1&sellToken=bad&buyToken=ETH&sellAmount=0&taker=bad",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("validation_error");
  });

  it("GET /api/swap/status reports 0x Jupiter and Rango without exposing keys", async () => {
    await app.close();
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        ZEROX_API_KEY: "zero-x-secret",
        JUPITER_API_KEY: "jupiter-secret",
        RANGO_API_KEY: "rango-secret",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/status",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().providers.map((provider: { provider: string }) => provider.provider)).toEqual([
      "0x",
      "jupiter",
      "rango",
    ]);
    expect(JSON.stringify(response.json())).not.toContain("secret");
  });

  it("GET /api/swap/solana/jupiter/quote sends API key server-side and maps safe quote", async () => {
    await app.close();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      inAmount: "1000000",
      outAmount: "150000",
      otherAmountThreshold: "149250",
      priceImpactPct: "0.001",
      routePlan: [{
        swapInfo: {
          inputMint: "So11111111111111111111111111111111111111112",
          outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          inAmount: "1000000",
          outAmount: "150000",
          label: "Meteora DLMM",
        },
      }],
      contextSlot: 123,
      timeTaken: 0.12,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        JUPITER_API_KEY: "jupiter-secret",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/solana/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000",
    });

    expect(response.statusCode).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/swap/v1/quote");
    expect((init as RequestInit).headers).toMatchObject({
      "x-api-key": "jupiter-secret",
    });
    expect(response.json()).toMatchObject({
      provider: "jupiter",
      mode: "quote",
      outAmountRaw: "150000",
    });
    expect(JSON.stringify(response.json())).not.toContain("jupiter-secret");
  });

  it("GET /api/swap/rango/quote keeps api key server-side and maps safe route", async () => {
    await app.close();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      requestId: "rango-1",
      outputAmount: "0.9",
      outputAmountHumanReadable: "0.9",
      route: [{ swapperId: "Thorchain", fromBlockchain: "ETH", toBlockchain: "BTC" }],
      tx: {
        type: "EVM",
        to: "0x00000000000000000000000000000000000000bb",
        data: "0xabcdef",
        value: "1",
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({
      store: new MemoryStore(),
      logger: false,
      env: readEnv({
        NODE_ENV: "test",
        RANGO_API_KEY: "rango-secret",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/swap/rango/quote?from=ETH.ETH&to=BTC.BTC&amount=1",
    });

    expect(response.statusCode).toBe(200);
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("apiKey=rango-secret");
    expect(response.json()).toMatchObject({
      provider: "rango",
      mode: "quote",
      routeLabel: "Thorchain",
    });
    expect(JSON.stringify(response.json())).not.toContain("rango-secret");
  });
});
