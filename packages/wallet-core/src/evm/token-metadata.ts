import {
  buildNativeEvmTokenMetadata,
  getCuratedEvmTokenMetadata,
  type EvmTokenMetadata,
  type EvmTokenMetadataSource,
} from "@acorus/shared";
import type { Address } from "viem";
import { createEvmPublicClient } from "./client.js";
import { ERC20_ABI } from "./erc20Abi.js";

const NAME_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export interface Erc20TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
}

export async function readErc20TokenMetadata(
  tokenAddress: Address,
  chainId: number,
  env?: Record<string, string | undefined>,
): Promise<Erc20TokenMetadata> {
  const client = createEvmPublicClient(chainId, env);

  const [symbol, name, decimals] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    client.readContract({
      address: tokenAddress,
      abi: NAME_ABI,
      functionName: "name",
    }),
    client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);

  return {
    symbol: symbol as string,
    name: name as string,
    decimals: decimals as number,
  };
}

export async function readEvmTokenMetadata(input: {
  chainId: number;
  tokenAddress: Address | "native";
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  watchedToken?: Partial<EvmTokenMetadata> | null;
  userToken?: Partial<EvmTokenMetadata> | null;
}): Promise<EvmTokenMetadata> {
  if (input.tokenAddress === "native") {
    return buildNativeEvmTokenMetadata(input.chainId);
  }

  const curated = getCuratedEvmTokenMetadata(input.chainId, input.tokenAddress);
  if (curated) {
    return curated;
  }

  const watched = toOverrideMetadata(
    input.chainId,
    input.tokenAddress,
    input.watchedToken,
    "watched",
  );
  if (watched) {
    return watched;
  }

  const user = toOverrideMetadata(
    input.chainId,
    input.tokenAddress,
    input.userToken,
    "user",
  );
  if (user) {
    return user;
  }

  try {
    const metadata = await withTimeout(
      readErc20TokenMetadata(input.tokenAddress, input.chainId, input.env),
      input.timeoutMs ?? 2_500,
    );
    return {
      chainId: input.chainId,
      address: input.tokenAddress,
      symbol: sanitizeSymbol(metadata.symbol, input.tokenAddress),
      name: sanitizeName(metadata.name, metadata.symbol, input.tokenAddress),
      decimals: sanitizeDecimals(metadata.decimals),
      logoUrl: null,
      verified: false,
      source: "onchain",
    };
  } catch {
    return {
      chainId: input.chainId,
      address: input.tokenAddress,
      symbol: fallbackTokenSymbol(input.tokenAddress),
      name: fallbackTokenName(input.tokenAddress),
      decimals: 18,
      logoUrl: null,
      verified: false,
      source: "user",
    };
  }
}

function toOverrideMetadata(
  chainId: number,
  tokenAddress: string,
  metadata: Partial<EvmTokenMetadata> | null | undefined,
  source: EvmTokenMetadataSource,
): EvmTokenMetadata | null {
  if (!metadata) {
    return null;
  }

  const symbol = sanitizeSymbol(metadata.symbol, tokenAddress);
  const name = sanitizeName(metadata.name, symbol, tokenAddress);

  return {
    chainId,
    address: tokenAddress,
    symbol,
    name,
    decimals: sanitizeDecimals(metadata.decimals),
    logoUrl: metadata.logoUrl ?? null,
    verified: metadata.verified ?? false,
    source,
  };
}

function sanitizeSymbol(value: unknown, tokenAddress: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim().slice(0, 24);
  }

  return fallbackTokenSymbol(tokenAddress);
}

function sanitizeName(
  value: unknown,
  symbol: string,
  tokenAddress: string,
): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim().slice(0, 80);
  }

  return symbol !== fallbackTokenSymbol(tokenAddress)
    ? `${symbol} Token`
    : fallbackTokenName(tokenAddress);
}

function sanitizeDecimals(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 30
    ? value
    : 18;
}

function fallbackTokenSymbol(tokenAddress: string): string {
  return `TKN-${tokenAddress.slice(2, 6).toUpperCase()}`;
}

function fallbackTokenName(tokenAddress: string): string {
  return `Custom Token ${tokenAddress.slice(0, 6)}…${tokenAddress.slice(-4)}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error("Token metadata request timed out."));
      }, timeoutMs);
    }),
  ]);
}
