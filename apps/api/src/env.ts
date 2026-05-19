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

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
};

// Canonical market provider modes (real/real_with_mock_fallback/mock).
// Legacy aliases live/auto are accepted and mapped to "real".
const marketProviderModeSchema = z
  .enum(["mock", "real", "real_with_mock_fallback", "live", "auto"])
  .transform((v) => (v === "live" || v === "auto" ? "real" : v) as "mock" | "real" | "real_with_mock_fallback")
  .default("real");

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

  // Canonical name (preferred); legacy names kept for backward compat
  MARKET_PROVIDER_MODE: marketProviderModeSchema,

  DEXSCREENER_BASE_URL: z.string().default("https://api.dexscreener.com"),
  COINGECKO_BASE_URL: z.string().default("https://api.coingecko.com/api/v3"),
  COINGECKO_API_KEY: optionalStringFromEnv,

  // Canonical names (preferred)
  MARKET_CACHE_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  MARKET_STALE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  MARKET_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().optional(),

  // Legacy names (backward compat – used when canonical not set)
  MARKET_PRICE_TTL_SEC: z.coerce.number().int().positive().default(60),
  MARKET_CHART_TTL_SEC: z.coerce.number().int().positive().default(300),
  MARKET_DISCOVERY_TTL_SEC: z.coerce.number().int().positive().default(300),
  MARKET_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  MARKET_RATE_LIMIT_RPM: z.coerce.number().int().positive().default(30),

  ZEROX_API_KEY: optionalStringFromEnv,
  ZEROX_API_BASE: z.string().url().default("https://api.0x.org"),
  ZEROX_API_VERSION: z.string().default("v2"),
  ZEROX_ENABLED: boolFromEnv.default(true),
  ZEROX_AFFILIATE_FEE_BPS: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(0).max(10000).optional(),
  ),
  ZEROX_FEE_RECIPIENT: optionalStringFromEnv,
  ZEROX_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function readEnv(input: NodeJS.ProcessEnv = process.env): ApiEnv {
  return envSchema.parse(input);
}

/** Resolve canonical cache TTL (MARKET_CACHE_TTL_SECONDS beats legacy MARKET_PRICE_TTL_SEC). */
export function resolveMarketCacheTtlSec(env: ApiEnv): number {
  return env.MARKET_CACHE_TTL_SECONDS ?? env.MARKET_PRICE_TTL_SEC;
}

/** Resolve canonical rate-limit RPM (MARKET_RATE_LIMIT_PER_MINUTE beats legacy MARKET_RATE_LIMIT_RPM). */
export function resolveMarketRateLimitRpm(env: ApiEnv): number {
  return env.MARKET_RATE_LIMIT_PER_MINUTE ?? env.MARKET_RATE_LIMIT_RPM;
}

export function requireDatabaseUrl(env: Pick<ApiEnv, "DATABASE_URL">): string {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when ACORUS_ENABLE_PRISMA_STORE=true");
  }

  return env.DATABASE_URL;
}
