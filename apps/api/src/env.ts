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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().optional(),
  ACORUS_ENABLE_PRISMA_STORE: boolFromEnv.default(false),
  LOG_LEVEL: z.string().default("info"),
  NEXT_PUBLIC_ETH_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_BSC_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_POLYGON_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_ARBITRUM_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_OPTIMISM_RPC_URL: z.string().optional(),
  NEXT_PUBLIC_BASE_RPC_URL: z.string().optional(),
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
