import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { createDefaultSwapQuoteEngine, refreshTxStatus } from "@acorus/wallet-core";
import type { AppStore } from "./store";
import { MemoryStore } from "./memory-store";
import { PrismaStore } from "./prisma-store";
import { buildLoggerOptions, createLogger } from "./logger";
import { readEnv, requireDatabaseUrl, resolveMarketCacheTtlSec, type ApiEnv } from "./env";
import { normalizeAddressForChain } from "@acorus/shared";
import {
  type ContactCreateInput,
  type ContactUpdateInput,
  type CreateUserTokenInput,
  type FiatCurrency,
  type GetMarketChartInput,
  type GetMarketPricesInput,
  type MarketChartDto,
  type TransactionCreateInput,
  type WalletProfileCreateInput,
  type WalletProfileUpdateInput,
} from "./store";
import { createMarketDataProvider, MockMarketDataProvider } from "./market/index.js";
import { createJupiterSwapService } from "./services/jupiter";
import { createRangoSwapService } from "./services/rango";
import { SwapProviderError } from "./services/swap-errors";
import { createZeroXSwapService, ZeroXSwapError } from "./services/zero-x";
import { z } from "zod";

const walletProfileCreateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["local", "view_only", "practice"]),
  publicAddress: z.string().min(1),
  chainFamily: z.enum(["evm", "solana", "tron"]),
  hiddenBalance: z.boolean().optional(),
  preferredCurrency: z.enum(["USD", "EUR", "RUB"]).optional(),
});

const walletProfileUpdateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  hiddenBalance: z.boolean().optional(),
  preferredCurrency: z.enum(["USD", "EUR", "RUB"]).optional(),
});

const contactSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  chainFamily: z.enum(["evm", "solana", "tron"]),
  note: z.string().nullable().optional(),
});

const transactionCreateSchema = z.object({
  userId: z.string().min(1),
  walletProfileId: z.string().min(1),
  chainId: z.coerce.number().int().positive(),
  hash: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  assetType: z.enum(["native", "erc20", "nft", "practice"]),
  tokenAddress: z.string().nullable().optional(),
  symbol: z.string().min(1),
  amount: z.string().min(1),
  status: z.enum(["pending", "confirmed", "failed", "unknown"]).optional(),
  direction: z.enum(["in", "out", "self"]),
  submittedAt: z.string().datetime().optional(),
  confirmedAt: z.string().datetime().nullable().optional(),
  rawStatus: z.string().nullable().optional(),
});

const transactionStatusSchema = z.object({
  userId: z.string().min(1),
});

const onboardingProgressSchema = z.object({
  userId: z.string().min(1),
  step: z.string().min(1),
  completed: z.boolean(),
});

const assetRefSchema = z.object({
  family: z.enum(["evm", "solana", "tron", "utxo", "ton"]),
  chainId: z.union([z.number(), z.string()]),
  type: z.enum(["native", "erc20", "spl", "trc20", "utxo", "jetton", "unknown"]),
  symbol: z.string().min(1),
  name: z.string().min(1),
  decimals: z.number().int().nonnegative(),
  tokenAddress: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
});

const evmZeroXSwapQuerySchema = z
  .object({
    chainId: z.coerce.number().int().positive(),
    sellToken: z.string().min(1),
    buyToken: z.string().min(1),
    sellAmount: z.string().regex(/^[1-9][0-9]*$/u).optional(),
    buyAmount: z.string().regex(/^[1-9][0-9]*$/u).optional(),
    taker: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
    slippageBps: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .refine((value) => Boolean(value.sellAmount) !== Boolean(value.buyAmount), {
    message: "Use exactly one of sellAmount or buyAmount.",
    path: ["sellAmount"],
  });

const solanaJupiterQuoteSchema = z.object({
  inputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u),
  outputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u),
  amount: z.string().regex(/^[1-9][0-9]*$/u),
  slippageBps: z.coerce.number().int().min(0).max(10_000).optional(),
});

const solanaJupiterSwapSchema = solanaJupiterQuoteSchema.extend({
  userPublicKey: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u),
});

const rangoSwapQuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u),
  fromAddress: z.string().min(1).optional(),
  toAddress: z.string().min(1).optional(),
  slippageBps: z.coerce.number().int().min(0).max(10_000).optional(),
});

const SENSITIVE_FIELD_NAMES = new Set([
  "mnemonic",
  "seed",
  "seedphrase",
  "privatekey",
  "passcode",
  "password",
  "signature",
  "rawtransaction",
]);

function buildWalletSearchResults(query: string) {
  const trimmed = query.trim();

  if (/^0x[a-fA-F0-9]{40}$/u.test(trimmed)) {
    return [{
      id: `wallet:evm:${trimmed.toLowerCase()}`,
      kind: "wallet" as const,
      label: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
      subtitle: "EVM wallet address",
      href: `/view-only?address=${encodeURIComponent(trimmed)}&family=evm`,
      chainKey: "evm",
      chainId: 1,
    }];
  }

  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/u.test(trimmed)) {
    return [{
      id: `wallet:tron:${trimmed}`,
      kind: "wallet" as const,
      label: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
      subtitle: "Tron wallet address",
      href: `/view-only?address=${encodeURIComponent(trimmed)}&family=tron`,
      chainKey: "tron",
      chainId: "tron-mainnet",
    }];
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u.test(trimmed)) {
    return [{
      id: `wallet:solana:${trimmed}`,
      kind: "wallet" as const,
      label: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
      subtitle: "Solana wallet address",
      href: `/view-only?address=${encodeURIComponent(trimmed)}&family=solana`,
      chainKey: "solana",
      chainId: 101,
    }];
  }

  return [];
}

export interface BuildAppOptions {
  env?: ApiEnv;
  store?: AppStore;
  logger?: FastifyBaseLogger | boolean;
}

function resolveCorsOrigin(env: ApiEnv): true | string[] {
  if (!env.CORS_ORIGIN) {
    return true;
  }

  const origins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

function getStatusCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return null;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export function resolveStore(env: ApiEnv): AppStore {
  if (env.ACORUS_ENABLE_PRISMA_STORE) {
    requireDatabaseUrl(env);
    return new PrismaStore();
  }

  return new MemoryStore();
}

function normalizeError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof z.ZodError) {
    return {
      statusCode: 400,
      message: "validation_error",
    };
  }

  if (error instanceof Error && error.message === "sensitive_fields_forbidden") {
    return {
      statusCode: 400,
      message: "sensitive_fields_forbidden",
    };
  }

  if (error instanceof Error && error.message === "custom_token_delete_only") {
    return {
      statusCode: 400,
      message: "bad_request",
    };
  }

  const statusCode = getStatusCode(error);

  if (statusCode !== null) {
    if (statusCode === 404) {
      return {
        statusCode,
        message: "not_found",
      };
    }

    if (statusCode >= 400 && statusCode < 500) {
      return {
        statusCode,
        message: "bad_request",
      };
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("not found")) {
      return {
        statusCode: 404,
        message: "not_found",
      };
    }

    return {
      statusCode: 500,
      message: "internal_error",
    };
  }

  return {
    statusCode: 500,
    message: "internal_error",
  };
}

function findSensitiveField(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findSensitiveField(item);

      if (nested) {
        return nested;
      }
    }

    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();

    if (SENSITIVE_FIELD_NAMES.has(normalizedKey)) {
      return key;
    }

    const nested = findSensitiveField(nestedValue);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function assertNoSensitiveFields(value: unknown): void {
  if (findSensitiveField(value)) {
    throw new Error("sensitive_fields_forbidden");
  }
}

function rejectSensitiveBody(value: unknown): void {
  assertNoSensitiveFields(value);
}

function containsSensitiveSwapField(body: Record<string, unknown>): boolean {
  const keys = JSON.stringify(body).toLowerCase();
  return (
    keys.includes("mnemonic") ||
    keys.includes("privatekey") ||
    keys.includes("private_key") ||
    keys.includes("passcode") ||
    keys.includes("seed")
  );
}

function normalizeTokenAddress(chainId: number, tokenAddress?: string | null): string | null {
  const normalized = normalizeAddressForChain(chainId, tokenAddress);
  return normalized || null;
}

function marketRequestKey(input: {
  chainId: number;
  symbol: string;
  tokenAddress?: string | null;
}): string {
  return `${normalizeTokenAddress(input.chainId, input.tokenAddress) ?? ""}:${input.symbol.toUpperCase()}`;
}

function isFresh(updatedAt: string, ttlSeconds: number): boolean {
  return Date.now() - new Date(updatedAt).getTime() < ttlSeconds * 1000;
}

function isStaleButUsable(updatedAt: string, ttlSeconds: number): boolean {
  return Date.now() - new Date(updatedAt).getTime() < ttlSeconds * 1000;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const env = options.env ?? readEnv();
  const app = Fastify(
    typeof options.logger === "boolean"
      ? { logger: options.logger }
      : {
          loggerInstance:
            options.logger ?? createLogger(buildLoggerOptions(env.LOG_LEVEL)),
        },
  );
  const store = options.store ?? resolveStore(env);
  const swapQuoteEngine = createDefaultSwapQuoteEngine();
  const zeroXSwapService = createZeroXSwapService(env);
  const jupiterSwapService = createJupiterSwapService(env);
  const rangoSwapService = createRangoSwapService(env);

  app.register(cors, { origin: resolveCorsOrigin(env) });
  app.addHook("onClose", async () => {
    await store.close();
  });
  app.setErrorHandler((error, request, reply) => {
    const normalized = normalizeError(error);

    request.log.error(
      {
        err: error,
        statusCode: normalized.statusCode,
      },
      "request_failed",
    );

    reply.status(normalized.statusCode).send({
      error: normalized.message,
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "acorus-wallet-api",
    store: env.ACORUS_ENABLE_PRISMA_STORE ? "prisma" : "memory",
    time: new Date().toISOString(),
  }));

  app.post("/api/users/anonymous", async (request) => {
    assertNoSensitiveFields(request.body);
    return store.createAnonymousUser();
  });

  app.get("/api/chains", async () => ({
    items: await store.listChains(),
  }));

  app.get("/api/tokens", async (request) => {
    const chainId = z.coerce
      .number()
      .optional()
      .parse((request.query as { chainId?: string }).chainId);
    return {
      items: await store.listTokens(chainId),
    };
  });

  app.get("/api/prices", async (request) => {
    const symbols = ((request.query as { symbols?: string }).symbols ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      items: symbols.map((symbol) => ({
        symbol,
        price: null,
        currency: "USD",
        provider: "stub",
      })),
    };
  });

  app.post("/api/swap/quote", async (request, reply) => {
    const body = request.body as Record<string, unknown> | null;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply.code(400).send({
        error: "bad_request",
      });
    }

    if (containsSensitiveSwapField(body)) {
      return reply.code(400).send({
        error: "sensitive_fields_not_allowed",
      });
    }

    const { from, to, amountRaw, amountFormatted, slippageBps, slippageMode, userAddress } = body;

    if (!from || !to) {
      return reply.code(400).send({
        error: "from_and_to_required",
      });
    }

    if (!amountRaw && !amountFormatted) {
      return reply.code(400).send({
        error: "amount_required",
      });
    }

    const quote = await swapQuoteEngine.getQuote({
      from: assetRefSchema.parse(from),
      to: assetRefSchema.parse(to),
      amountRaw: typeof amountRaw === "string" ? amountRaw : undefined,
      amountFormatted: typeof amountFormatted === "string" ? amountFormatted : undefined,
      slippageBps: typeof slippageBps === "number" ? slippageBps : undefined,
      slippageMode: slippageMode === "auto" || slippageMode === "custom" ? slippageMode : undefined,
      userAddress: typeof userAddress === "string" ? userAddress : null,
    });

    return {
      ok: true,
      quote,
    };
  });

  app.post("/api/wallet-profiles", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = walletProfileCreateSchema.parse(request.body);
    return store.createWalletProfile(body as WalletProfileCreateInput);
  });

  app.get("/api/wallet-profiles", async (request) => {
    const userId = z.string().min(1).parse((request.query as { userId?: string }).userId);
    return {
      items: await store.listWalletProfiles(userId),
    };
  });

  app.patch("/api/wallet-profiles/:id", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = walletProfileUpdateSchema.parse(request.body);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return store.updateWalletProfile(params.id, body as WalletProfileUpdateInput);
  });

  app.delete("/api/wallet-profiles/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const userId = z.string().min(1).parse((request.query as { userId?: string }).userId);
    await store.deleteWalletProfile(params.id, userId);
    reply.code(204);
  });

  app.post("/api/contacts", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = contactSchema.parse(request.body);
    return store.createContact(body as ContactCreateInput);
  });

  app.get("/api/contacts", async (request) => {
    const userId = z.string().min(1).parse((request.query as { userId?: string }).userId);
    return {
      items: await store.listContacts(userId),
    };
  });

  app.patch("/api/contacts/:id", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = contactSchema.parse(request.body);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return store.updateContact(params.id, body as ContactUpdateInput);
  });

  app.delete("/api/contacts/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const userId = z.string().min(1).parse((request.query as { userId?: string }).userId);
    await store.deleteContact(params.id, userId);
    reply.code(204);
  });

  app.post("/api/transactions", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = transactionCreateSchema.parse(request.body);
    return store.createTransaction(body as TransactionCreateInput);
  });

  app.get("/api/transactions", async (request) => {
    const query = z
      .object({
        userId: z.string().min(1),
        walletProfileId: z.string().min(1).optional(),
      })
      .parse(request.query);

    return {
      items: await store.listTransactions(query.userId, query.walletProfileId),
    };
  });

  app.patch("/api/transactions/:id/status", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = transactionStatusSchema.parse(request.body);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const record = await store.getTransaction(params.id, body.userId);

    if (record.assetType === "practice" || !record.hash.startsWith("0x")) {
      return record;
    }

    const status = await refreshTxStatus(
      record.chainId,
      record.hash as `0x${string}`,
      process.env,
    );
    const confirmedAt = status === "confirmed" ? new Date().toISOString() : null;

    return store.updateTransactionStatus(params.id, body.userId, {
      status,
      rawStatus: status,
      confirmedAt,
    });
  });

  app.get("/api/onboarding-progress", async (request) => {
    const userId = z.string().min(1).parse((request.query as { userId?: string }).userId);
    return {
      items: await store.getOnboardingProgress(userId),
    };
  });

  app.post("/api/onboarding-progress", async (request) => {
    assertNoSensitiveFields(request.body);
    const body = onboardingProgressSchema.parse(request.body);
    return store.setOnboardingProgress(body.userId, body.step, body.completed);
  });

  const marketProvider = createMarketDataProvider(env);
  const mockFallback = new MockMarketDataProvider();
  const cacheTtlSec = resolveMarketCacheTtlSec(env);
  const staleTtlSec = env.MARKET_STALE_CACHE_TTL_SECONDS;
  const coinChartCache = new Map<string, MarketChartDto>();

  // ---- User Tokens ----
  const fiatCurrencySchema = z.enum(["USD", "EUR", "RUB"]);
  const chartRangeSchema = z.enum(["1H", "1D", "1W", "1M", "1Y", "ALL"]);

  const createUserTokenSchema = z.object({
    userId: z.string().min(1),
    walletProfileId: z.string().min(1).nullable().optional(),
    chainId: z.coerce.number().int().positive(),
    tokenAddress: z.string().min(1),
    symbol: z.string().min(1).max(24),
    name: z.string().min(1).max(120),
    decimals: z.coerce.number().int().min(0).max(36),
    logoUrl: z.string().url().nullable().optional(),
    isVerified: z.boolean().optional(),
    isCustom: z.boolean().optional(),
    isHidden: z.boolean().optional(),
    sourceStatus: z.string().nullable().optional(),
    liquidityUsd: z.number().nullable().optional(),
    volume24hUsd: z.number().nullable().optional(),
    marketCapUsd: z.number().nullable().optional(),
    fdvUsd: z.number().nullable().optional(),
    pairUrl: z.string().nullable().optional(),
    riskLevel: z.string().nullable().optional(),
    riskFlags: z.array(z.string()).optional(),
    riskFlagsJson: z.string().nullable().optional(),
  });

  const hideTokenSchema = z.object({
    userId: z.string().min(1),
    walletProfileId: z.string().min(1).nullable().optional(),
    chainId: z.coerce.number().int().positive(),
    tokenAddress: z.string().min(1),
    symbol: z.string().min(1),
    name: z.string().min(1),
    decimals: z.coerce.number().int().min(0).max(36),
    isCustom: z.boolean().optional(),
  });

  const unhideTokenSchema = z.object({
    userId: z.string().min(1),
    chainId: z.coerce.number().int().positive(),
    tokenAddress: z.string().min(1),
  });

  app.get("/api/user-tokens", async (request) => {
    const query = z
      .object({
        userId: z.string().min(1),
        walletProfileId: z.string().min(1).optional(),
      })
      .parse(request.query);
    const tokens = await store.listUserTokens(query.userId, query.walletProfileId);
    return { ok: true, tokens };
  });

  app.post("/api/user-tokens", async (request) => {
    rejectSensitiveBody(request.body);
    const input = createUserTokenSchema.parse(request.body);
    const token = await store.createUserToken(input as CreateUserTokenInput);
    return { ok: true, token };
  });

  app.post("/api/user-tokens/hide", async (request) => {
    rejectSensitiveBody(request.body);
    const input = hideTokenSchema.parse(request.body);
    const token = await store.hideToken(input);
    return { ok: true, token };
  });

  app.post("/api/user-tokens/unhide", async (request) => {
    rejectSensitiveBody(request.body);
    const input = unhideTokenSchema.parse(request.body);
    const token = await store.unhideToken(input);
    return { ok: true, token };
  });

  app.patch("/api/user-tokens/:id/visibility", async (request) => {
    assertNoSensitiveFields(request.body);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ isHidden: z.boolean() }).parse(request.body);
    const token = await store.updateUserTokenVisibility(params.id, body.isHidden);
    return { ok: true, token };
  });

  app.delete("/api/user-tokens/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    await store.deleteUserToken(params.id);
    reply.code(204);
  });

  // ---- Market Prices ----
  app.get("/api/market/prices", async (request) => {
    const query = z
      .object({
        chainId: z.coerce.number().int().positive(),
        currency: fiatCurrencySchema.default("USD"),
        symbols: z.string().optional(),
        tokenAddresses: z.string().optional(),
      })
      .parse(request.query);

    const symbols = query.symbols
      ? query.symbols.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const tokenAddresses = query.tokenAddresses
      ? query.tokenAddresses.split(",").map((s) => s.trim())
      : [];

    if (symbols.length === 0) {
      return { ok: true, prices: [] };
    }

    const requests = symbols.map((symbol, index) => ({
      chainId: query.chainId,
      symbol,
      tokenAddress: normalizeTokenAddress(query.chainId, tokenAddresses[index] ?? null),
      currency: query.currency as FiatCurrency,
    }));

    // Step 1: read store cache
    const cachedAll = await store.getMarketPrices({
      chainId: query.chainId,
      currency: query.currency as FiatCurrency,
      symbols,
      tokenAddresses,
    });

    const cachedByKey = new Map(cachedAll.map((price) => [marketRequestKey(price), price]));

    // Step 2: if ALL requested symbols have a fresh cache hit, return cached
    const freshPrices = requests.map((marketRequest) => {
      const cached = cachedByKey.get(marketRequestKey(marketRequest));
      if (!cached || !isFresh(cached.updatedAt, cacheTtlSec)) {
        return null;
      }
      return { ...cached, sourceStatus: "cached" };
    });

    if (freshPrices.every(Boolean)) {
      const prices = freshPrices.filter((price): price is NonNullable<typeof price> => Boolean(price));
      return { ok: true, prices };
    }

    // Step 3: try live provider
    try {
      const livePrices = await marketProvider.getPrices(requests);
      for (const price of livePrices) {
        await store.upsertMarketPrice(price);
      }
      return {
        ok: true,
        prices: livePrices.map((p) => ({
          ...p,
          sourceStatus: p.sourceStatus ?? "live",
        })),
      };
    } catch {
      // Provider failed: fall through to stale cache, then return honest empty data.
    }

    // Step 4: stale cache fallback (within MARKET_STALE_CACHE_TTL_SECONDS)
    const stalePrices = requests.map((marketRequest) => {
      const cached = cachedByKey.get(marketRequestKey(marketRequest));
      if (!cached || !isStaleButUsable(cached.updatedAt, staleTtlSec)) {
        return null;
      }
      return { ...cached, sourceStatus: "stale_cache" };
    });

    if (stalePrices.every(Boolean)) {
      return {
        ok: true,
        prices: stalePrices.filter((price): price is NonNullable<typeof price> => Boolean(price)),
      };
    }

    // Step 5: no public mock pricing. The client can render an unavailable state.
    return { ok: true, prices: [] };
  });

  // ---- Market Chart ----
  app.get("/api/market/chart", async (request) => {
    const query = z
      .object({
        chainId: z.coerce.number().int().positive(),
        currency: fiatCurrencySchema.default("USD"),
        symbol: z.string().min(1),
        tokenAddress: z.string().optional(),
        range: chartRangeSchema.default("1W"),
      })
      .parse(request.query);

    const chartInput = {
      chainId: query.chainId,
      tokenAddress: normalizeTokenAddress(query.chainId, query.tokenAddress ?? null),
      symbol: query.symbol,
      currency: query.currency as FiatCurrency,
      range: query.range as GetMarketChartInput["range"],
    };

    const cached = await store.getMarketChart(chartInput);

    if (cached && isFresh(cached.updatedAt, cacheTtlSec)) {
      return {
        ok: true,
        chart: {
          ...cached,
          sourceStatus: "cached",
        },
      };
    }

    try {
      const chart = await marketProvider.getChart(chartInput);
      await store.upsertMarketChart(chart);
      return {
        ok: true,
        chart: {
          ...chart,
          sourceStatus: chart.sourceStatus ?? (chart.provider === "mock" ? "fallback_mock" : "live"),
        },
      };
    } catch {
      if (cached && isStaleButUsable(cached.updatedAt, staleTtlSec)) {
        return {
          ok: true,
          chart: {
            ...cached,
            sourceStatus: "stale_cache",
          },
        };
      }

      return {
        ok: true,
        chart: {
          ...chartInput,
          points: [],
          provider: "market",
          sourceStatus: "unavailable",
          updatedAt: new Date().toISOString(),
        },
      };
    }
  });

  app.get("/api/market/coin-chart", async (request) => {
    const query = z
      .object({
        coinId: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/u),
        currency: fiatCurrencySchema.default("USD"),
        range: chartRangeSchema.default("1W"),
      })
      .parse(request.query);

    if (!marketProvider.getCoinChartById) {
      return {
        ok: true,
        chart: createUnavailableCoinChart(query.coinId, query.currency as FiatCurrency, query.range as GetMarketChartInput["range"]),
      };
    }

    const cacheKey = [
      query.coinId.toLowerCase(),
      query.currency,
      query.range,
    ].join(":");
    const cached = coinChartCache.get(cacheKey);

    try {
      const chart = await marketProvider.getCoinChartById(query.coinId, {
        currency: query.currency as FiatCurrency,
        range: query.range as GetMarketChartInput["range"],
      });
      const normalizedChart = {
        ...chart,
        sourceStatus: chart.sourceStatus ?? (chart.provider === "mock" ? "fallback_mock" : "live"),
      };
      if (normalizedChart.points.length > 1) {
        coinChartCache.set(cacheKey, normalizedChart);
      }
      return {
        ok: true,
        chart: normalizedChart,
      };
    } catch {
      if (cached && isStaleButUsable(cached.updatedAt, staleTtlSec)) {
        return {
          ok: true,
          chart: {
            ...cached,
            sourceStatus: isFresh(cached.updatedAt, cacheTtlSec) ? "cached" : "stale_cache",
          },
        };
      }

      return {
        ok: true,
        chart: createUnavailableCoinChart(query.coinId, query.currency as FiatCurrency, query.range as GetMarketChartInput["range"]),
      };
    }
  });

  app.get("/api/market/token-detail", async (request) => {
    const query = z
      .object({
        coinId: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/u).optional(),
        chainId: z.coerce.number().int().positive().optional(),
        tokenAddress: z.string().optional(),
        symbol: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(120).optional(),
        currency: fiatCurrencySchema.default("USD"),
      })
      .parse(request.query);

    if (query.coinId) {
      const detail = marketProvider.getTokenDetailByCoinId
        ? await marketProvider.getTokenDetailByCoinId(query.coinId, query.currency as FiatCurrency)
        : await mockFallback.getTokenDetailByCoinId(query.coinId, query.currency as FiatCurrency);
      return {
        ok: true,
        detail: detail.sourceStatus === "unavailable"
          ? {
              ...detail,
              symbol: query.symbol?.toUpperCase() ?? detail.symbol,
              name: query.name ?? detail.name,
              description: detail.description ?? `Live market metadata is temporarily unavailable for ${query.name ?? detail.name}.`,
            }
          : detail,
      };
    }

    if (!query.chainId || !query.tokenAddress) {
      return { ok: false, error: "token_detail_query_required" };
    }

    assertNoSensitiveFields({ tokenAddress: query.tokenAddress });

    const normalized = normalizeTokenAddress(query.chainId, query.tokenAddress);
    if (!normalized) {
      return { ok: false, error: "invalid_token_address" };
    }

    const discovery = marketProvider.discoverToken
      ? await marketProvider.discoverToken(query.chainId, normalized).catch(() => null)
      : null;
    const prices = await marketProvider.getPrices([{
      chainId: query.chainId,
      tokenAddress: normalized,
      symbol: discovery?.symbol ?? "TOKEN",
      currency: query.currency as FiatCurrency,
    }]).catch(() => []);
    const price = prices[0] ?? null;

    return {
      ok: true,
      detail: {
        id: `${query.chainId}:${normalized}`,
        symbol: discovery?.symbol ?? price?.symbol ?? "TOKEN",
        name: discovery?.name ?? price?.symbol ?? "Token",
        currency: query.currency,
        price: price?.price ?? null,
        change24h: price?.change24h ?? null,
        marketCapUsd: discovery?.marketCapUsd ?? price?.marketCap ?? null,
        fdvUsd: discovery?.fdvUsd ?? null,
        volume24hUsd: discovery?.volume24hUsd ?? price?.volume24h ?? null,
        liquidityUsd: discovery?.liquidityUsd ?? price?.liquidityUsd ?? null,
        high24hUsd: null,
        low24hUsd: null,
        rank: null,
        description: discovery?.description ?? null,
        logoUrl: discovery?.logoUrl ?? null,
        links: [
          discovery?.pairUrl ? { label: "Pair", url: discovery.pairUrl, kind: "pair" } : null,
          discovery?.explorerUrl ? { label: "Explorer", url: discovery.explorerUrl, kind: "explorer" } : null,
          discovery?.websiteUrl ? { label: "Website", url: discovery.websiteUrl, kind: "website" } : null,
          discovery?.twitterUrl ? { label: "X", url: discovery.twitterUrl, kind: "twitter" } : null,
          discovery?.telegramUrl ? { label: "Telegram", url: discovery.telegramUrl, kind: "telegram" } : null,
        ].filter(Boolean),
        platforms: [{
          chainId: query.chainId,
          chainKey: String(query.chainId),
          tokenAddress: normalized,
          decimals: discovery?.decimals ?? null,
        }],
        provider: discovery ? marketProvider.id : price?.provider ?? "market",
        sourceStatus: discovery || price ? "live" : "unavailable",
        updatedAt: new Date().toISOString(),
      },
    };
  });

  app.get("/api/market/search", async (request) => {
    const query = z
      .object({
        query: z.string().min(1).max(120),
      })
      .parse(request.query);

    const text = query.query.trim();
    const walletResults = buildWalletSearchResults(text);
    const marketResults = marketProvider.searchMarket
      ? await marketProvider.searchMarket(text).catch(() => [])
      : [];

    return {
      ok: true,
      results: [...walletResults, ...marketResults].slice(0, 14),
      updatedAt: new Date().toISOString(),
    };
  });

  // ---- Token Discovery ----
  app.get("/api/market/discover-token", async (request) => {
    const query = z
      .object({
        chainId: z.coerce.number().int().positive(),
        tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address"),
      })
      .parse(request.query);

    assertNoSensitiveFields({ tokenAddress: query.tokenAddress });

    if (!marketProvider.discoverToken) {
      return { ok: true, discovery: null };
    }

    try {
      const raw = await marketProvider.discoverToken(
        query.chainId,
        query.tokenAddress,
      );

      return {
        ok: true,
        discovery: {
          chainId: query.chainId,
          tokenAddress: query.tokenAddress,
          ...raw,
          sourceStatus: "live" as const,
          providerId: marketProvider.id,
        },
      };
    } catch {
      return { ok: true, discovery: null };
    }
  });

  // ---- Explore Feed ----
  app.get("/api/explore/trending", async () => {
    try {
      const items = marketProvider.getTrending
        ? await marketProvider.getTrending()
        : await mockFallback.getTrending!();
      return {
        ok: true,
        section: "trending",
        items,
        source: marketProvider.getTrending ? marketProvider.id : "mock",
        sourceStatus: marketProvider.getTrending ? "live" : "mock",
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return { ok: true, section: "trending", items: [], source: "market", sourceStatus: "unavailable", updatedAt: new Date().toISOString() };
    }
  });

  app.get("/api/explore/top", async (request) => {
    const query = request.query as {
      currency?: string;
      view?: string;
      page?: string;
      limit?: string;
    };
    const currency = fiatCurrencySchema.default("USD").parse(query.currency);
    const view = query.view === "gainers" || query.view === "losers" ? query.view : "top";
    const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(6, Number.parseInt(query.limit ?? "20", 10) || 20));

    try {
      const requestedCount = Math.max(limit * page, view === "top" ? limit : 50);
      const rawItems = marketProvider.getTopMarkets
        ? await marketProvider.getTopMarkets(currency as FiatCurrency, requestedCount)
        : await mockFallback.getTopMarkets!(currency as FiatCurrency, requestedCount);
      const sorted = sortExploreTopItems(rawItems, view);
      const items = sorted.slice((page - 1) * limit, page * limit);
      return { ok: true, section: view, items, source: marketProvider.id, sourceStatus: "live", updatedAt: new Date().toISOString() };
    } catch {
      return { ok: true, section: view, items: [], source: "market", sourceStatus: "unavailable", updatedAt: new Date().toISOString() };
    }
  });

  app.get("/api/swap/evm/status", async () => zeroXSwapService.getStatus());

  app.get("/api/swap/status", async () => ({
    ok: true,
    providers: [
      {
        provider: "0x",
        configured: zeroXSwapService.getStatus().configured,
        enabled: zeroXSwapService.getStatus().enabled,
        execution: "extension_evm",
        supportedFamilies: ["evm"],
        supportedChains: zeroXSwapService.getStatus().supportedChains,
        apiBase: zeroXSwapService.getStatus().apiBase,
      },
      {
        provider: "jupiter",
        configured: jupiterSwapService.getStatus().configured,
        enabled: jupiterSwapService.getStatus().enabled,
        execution: "solana_transaction_draft",
        supportedFamilies: jupiterSwapService.getStatus().supportedFamilies,
        supportedChains: jupiterSwapService.getStatus().supportedChains,
        apiBase: jupiterSwapService.getStatus().apiBase,
      },
      {
        provider: "rango",
        configured: rangoSwapService.getStatus().configured,
        enabled: rangoSwapService.getStatus().enabled,
        execution: "crosschain_transaction_draft",
        supportedFamilies: rangoSwapService.getStatus().supportedFamilies,
        supportedChains: rangoSwapService.getStatus().supportedChains,
        apiBase: rangoSwapService.getStatus().apiBase,
      },
    ],
  }));

  app.get("/api/swap/solana/jupiter/status", async () => jupiterSwapService.getStatus());

  app.get("/api/swap/solana/jupiter/quote", async (request, reply) => {
    try {
      const query = solanaJupiterQuoteSchema.parse(request.query);
      return await jupiterSwapService.getQuote(query, request.ip);
    } catch (error) {
      if (error instanceof SwapProviderError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get("/api/swap/solana/jupiter/swap", async (request, reply) => {
    try {
      const query = solanaJupiterSwapSchema.parse(request.query);
      return await jupiterSwapService.getSwapTransaction(query, request.ip);
    } catch (error) {
      if (error instanceof SwapProviderError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get("/api/swap/rango/status", async () => rangoSwapService.getStatus());

  app.get("/api/swap/rango/quote", async (request, reply) => {
    try {
      const query = rangoSwapQuerySchema.parse(request.query);
      return await rangoSwapService.getQuote(query, request.ip);
    } catch (error) {
      if (error instanceof SwapProviderError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get("/api/swap/rango/swap", async (request, reply) => {
    try {
      const query = rangoSwapQuerySchema.parse(request.query);
      return await rangoSwapService.getSwap(query, request.ip);
    } catch (error) {
      if (error instanceof SwapProviderError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get("/api/swap/evm/0x/sources", async () => ({
    ok: true,
    provider: "0x",
    approvalModel: "allowance_holder",
    configured: zeroXSwapService.getStatus().configured,
    sources: [],
  }));

  app.get("/api/swap/evm/0x/price", async (request, reply) => {
    try {
      const query = evmZeroXSwapQuerySchema.parse(request.query);
      return await zeroXSwapService.getPrice(query, request.ip);
    } catch (error) {
      if (error instanceof ZeroXSwapError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get("/api/swap/evm/0x/quote", async (request, reply) => {
    try {
      const query = evmZeroXSwapQuerySchema.parse(request.query);
      return await zeroXSwapService.getQuote(query, request.ip);
    } catch (error) {
      if (error instanceof ZeroXSwapError) {
        return reply.code(error.statusCode).send({
          error: error.code,
          message: error.message,
        });
      }

      throw error;
    }
  });

  app.get("/api/explore/memes", async () => {
    try {
      const items = marketProvider.getMemeBoosts
        ? await marketProvider.getMemeBoosts()
        : [];
      return { ok: true, section: "memes", items, source: "dexscreener_boost", sourceStatus: items.length > 0 ? "live" : "unavailable", updatedAt: new Date().toISOString() };
    } catch {
      return { ok: true, section: "memes", items: [], source: "market", sourceStatus: "unavailable", updatedAt: new Date().toISOString() };
    }
  });

  return app;
}

function createUnavailableCoinChart(
  coinId: string,
  currency: FiatCurrency,
  range: GetMarketChartInput["range"],
) {
  const knownSymbols: Record<string, string> = {
    bitcoin: "BTC",
    ethereum: "ETH",
    solana: "SOL",
    "the-open-network": "TON",
    binancecoin: "BNB",
    tron: "TRX",
    tether: "USDT",
    "usd-coin": "USDC",
  };

  return {
    chainId: 0,
    tokenAddress: coinId,
    symbol: knownSymbols[coinId.toLowerCase()] ?? coinId.toUpperCase(),
    currency,
    range,
    points: [],
    provider: "market",
    sourceStatus: "unavailable",
    updatedAt: new Date().toISOString(),
  };
}

function sortExploreTopItems<T extends { change24h?: number | null; marketCapUsd?: number | null }>(
  items: T[],
  view: "top" | "gainers" | "losers",
): T[] {
  const copy = [...items];

  if (view === "gainers") {
    return copy.sort((a, b) => (b.change24h ?? Number.NEGATIVE_INFINITY) - (a.change24h ?? Number.NEGATIVE_INFINITY));
  }

  if (view === "losers") {
    return copy.sort((a, b) => (a.change24h ?? Number.POSITIVE_INFINITY) - (b.change24h ?? Number.POSITIVE_INFINITY));
  }

  return copy.sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
}
