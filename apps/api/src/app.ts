import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { refreshTxStatus } from "@acorus/wallet-core";
import type { AppStore } from "./store";
import { MemoryStore } from "./memory-store";
import { PrismaStore } from "./prisma-store";
import { createLogger } from "./logger";
import { readEnv, type ApiEnv } from "./env";
import { PrismaClient } from "@prisma/client";
import {
  getChainsResponse,
  type ContactCreateInput,
  type ContactUpdateInput,
  type TransactionCreateInput,
  type WalletProfileCreateInput,
  type WalletProfileUpdateInput,
} from "./store";
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
  chainId: z.number().int().positive(),
  hash: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  assetType: z.enum(["native", "erc20", "nft", "practice"]),
  tokenAddress: z.string().nullable().optional(),
  symbol: z.string().min(1),
  amount: z.string().min(1),
  status: z.enum(["pending", "confirmed", "failed", "unknown"]),
  direction: z.enum(["in", "out", "self"]),
  submittedAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable().optional(),
  rawStatus: z.string().nullable().optional(),
});

const transactionStatusSchema = z.object({
  userId: z.string().min(1),
});

export interface BuildAppOptions {
  env?: ApiEnv;
  store?: AppStore;
  logger?: FastifyBaseLogger | boolean;
}

export function resolveStore(env: ApiEnv): AppStore {
  if (env.DATABASE_URL && process.env.ACORUS_ENABLE_PRISMA_STORE === "true") {
    return new PrismaStore(new PrismaClient());
  }

  return new MemoryStore();
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const env = options.env ?? readEnv();
  const app = Fastify(
    typeof options.logger === "boolean"
      ? { logger: options.logger }
      : { loggerInstance: options.logger ?? createLogger() },
  );
  const store = options.store ?? resolveStore(env);

  app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "acorus-wallet-api",
  }));

  app.post("/api/users/anonymous", async () => store.createAnonymousUser());

  app.get("/api/chains", async () => ({
    items: getChainsResponse(),
  }));

  app.get("/api/tokens", async (request) => {
    const chainId = z.coerce.number().parse((request.query as { chainId?: string }).chainId);
    return {
      items: await store.getTokens(chainId),
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

  return app;
}
