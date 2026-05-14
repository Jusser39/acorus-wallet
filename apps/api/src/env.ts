import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  API_PORT: z.coerce.number().default(4000),
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
