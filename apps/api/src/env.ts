import { z } from "zod";

const boolFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const optionalStringFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().optional(),
  ACORUS_ENABLE_PRISMA_STORE: boolFromEnv.default(false),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: optionalStringFromEnv,
  NEXT_PUBLIC_ETH_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_BSC_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_POLYGON_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_ARBITRUM_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_OPTIMISM_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_BASE_RPC_URL: z.string().optional(),
  MARKET_PROVIDER_MODE: z.enum(["mock", "live", "auto"]).default("auto"),
  DEXSCREENER_BASE_URL: z.string().default("https://api.dexscreener.com"),
  COINGECKO_BASE_URL: z.string().default("https://api.coingecko.com/api/v3"),
  COINGECKO_API_KEY: optionalStringFromEnv,
  MARKET_PRICE_TTL_SEC: z.coerce.number().int().positive().default(60),
  MARKET_CHART_TTL_SEC: z.coerce.number().int().positive().default(300),
  MARKET_DISCOVERY_TTL_SEC: z.coerce.number().int().positive().default(300),
  MARKET_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  MARKET_RATE_LIMIT_RPM: z.coerce.number().int().positive().default(30),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function readEnv(input: NodeJS.ProcessEnv = process.env): ApiEnv {
  return envSchema.parse(input);
}

export function requireDatabaseUrl(env: Pick<ApiEnv, "DATABASE_URL">): string {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when ACORUS_ENABLE_PRISMA_STORE=true");
  }

  return env.DATABASE_URL;
}
