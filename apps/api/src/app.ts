import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { refreshTxStatus } from "@acorus/wallet-core";
import type { AppStore } from "./store";
import { MemoryStore } from "./memory-store";
import { PrismaStore } from "./prisma-store";
import { buildLoggerOptions, createLogger } from "./logger";
import { readEnv, requireDatabaseUrl, type ApiEnv } from "./env";
import {
  type ContactCreateInput,
  type ContactUpdateInput,
  type CreateUserTokenInput,
  type FiatCurrency,
  type GetMarketChartInput,
  type GetMarketPricesInput,
  type TransactionCreateInput,
  type WalletProfileCreateInput,
  type WalletProfileUpdateInput,
} from "./store";
import { createMarketDataProvider } from "./market/index.js";
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

  // ---- User Tokens ----
  const fiatCurrencySchema = z.enum(["USD", "EUR", "RUB"]);
  const chartRangeSchema = z.enum(["1D", "7D", "1M", "3M", "1Y"]);

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
    riskFlagsJson: z.string().nullable().optional(),
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
    assertNoSensitiveFields(request.body);
    const input = createUserTokenSchema.parse(request.body);
    const token = await store.createUserToken(input as CreateUserTokenInput);
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
      ? query.tokenAddresses.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const cached = await store.getMarketPrices({
      chainId: query.chainId,
      currency: query.currency as FiatCurrency,
      symbols,
      tokenAddresses,
    });

    if (cached.length > 0) {
      return { ok: true, prices: cached };
    }

    if (symbols.length === 0) {
      return { ok: true, prices: [] };
    }

    const requests = symbols.map((symbol, index) => ({
      chainId: query.chainId,
      symbol,
      tokenAddress: tokenAddresses[index] ?? null,
      currency: query.currency as FiatCurrency,
    }));

    const prices = await marketProvider.getPrices(requests);

    for (const price of prices) {
      await store.upsertMarketPrice(price);
    }

    return { ok: true, prices };
  });

  // ---- Market Chart ----
  app.get("/api/market/chart", async (request) => {
    const query = z
      .object({
        chainId: z.coerce.number().int().positive(),
        currency: fiatCurrencySchema.default("USD"),
        symbol: z.string().min(1),
        tokenAddress: z.string().optional(),
        range: chartRangeSchema.default("7D"),
      })
      .parse(request.query);

    const cached = await store.getMarketChart({
      chainId: query.chainId,
      tokenAddress: query.tokenAddress ?? null,
      symbol: query.symbol,
      currency: query.currency as FiatCurrency,
      range: query.range as GetMarketChartInput["range"],
    });

    if (cached) {
      return { ok: true, chart: cached };
    }

    const chart = await marketProvider.getChart({
      chainId: query.chainId,
      tokenAddress: query.tokenAddress ?? null,
      symbol: query.symbol,
      currency: query.currency as FiatCurrency,
      range: query.range as GetMarketChartInput["range"],
    });

    await store.upsertMarketChart(chart);

    return { ok: true, chart };
  });

  // ---- Token Discovery ----
  app.get("/api/market/discover-token", async (request) => {
    const query = z
      .object({
        chainId: z.coerce.number().int().positive(),
        tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address"),
      })
      .parse(request.query);

    // Validate address doesn't look like a mnemonic or private key
    assertNoSensitiveFields({ tokenAddress: query.tokenAddress });

    if (!marketProvider.discoverToken) {
      return {
        ok: false,
        error: "Token discovery not supported",
      };
    }

    const discovery = await marketProvider.discoverToken(
      query.chainId,
      query.tokenAddress,
    );

    return {
      ok: true,
      discovery: {
        chainId: query.chainId,
        tokenAddress: query.tokenAddress,
        ...discovery,
        sourceStatus: "live" as const,
        providerId: marketProvider.id,
      },
    };
  });

  return app;
}
