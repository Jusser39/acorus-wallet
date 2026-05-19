import { getEvmChainConfig } from "./chains";
import { getCuratedTokens } from "./tokens";

export type EvmTokenMetadataSource =
  | "native"
  | "curated"
  | "watched"
  | "onchain"
  | "user";

export type EvmTokenMetadata = {
  chainId: number;
  address: string | "native";
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string | null;
  verified?: boolean;
  source: EvmTokenMetadataSource;
};

const FORMATTED_AMOUNT_REGEX = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u;

export function buildNativeEvmTokenMetadata(chainId: number): EvmTokenMetadata {
  const chain = getEvmChainConfig(chainId);

  return {
    chainId,
    address: "native",
    symbol: chain.nativeSymbol,
    name: chain.name,
    decimals: 18,
    logoUrl: null,
    verified: true,
    source: "native",
  };
}

export function getCuratedEvmTokenMetadata(
  chainId: number,
  address: string | "native",
): EvmTokenMetadata | null {
  if (address === "native") {
    return buildNativeEvmTokenMetadata(chainId);
  }

  const token = getCuratedTokens(chainId).find((item) =>
    item.address.toLowerCase() === address.toLowerCase()
  );

  if (!token) {
    return null;
  }

  return {
    chainId,
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    logoUrl: token.logoUrl,
    verified: token.verified,
    source: "curated",
  };
}

export function validateFormattedAmount(value: string): boolean {
  const normalized = value.trim();

  if (!normalized || !FORMATTED_AMOUNT_REGEX.test(normalized)) {
    return false;
  }

  return normalized !== "0";
}

export function normalizeEvmTokenAmount(
  formatted: string,
  decimals: number,
): string {
  const normalized = formatted.trim();

  if (!FORMATTED_AMOUNT_REGEX.test(normalized)) {
    throw new Error("Invalid amount format.");
  }

  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
    throw new Error("Invalid token decimals.");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");

  if (fractionPart.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimals.`);
  }

  const base = 10n ** BigInt(decimals);
  const whole = BigInt(wholePart || "0");
  const fraction = BigInt(
    (fractionPart.length ? fractionPart.padEnd(decimals, "0") : "0") || "0",
  );
  const raw = whole * base + fraction;

  if (raw <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return raw.toString();
}

export function formatEvmTokenAmount(raw: string, decimals: number): string {
  if (!/^[0-9]+$/u.test(raw)) {
    throw new Error("Invalid raw amount.");
  }

  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
    throw new Error("Invalid token decimals.");
  }

  const value = BigInt(raw);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/u, "");

  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
}

export function shortenFormattedEvmTokenAmount(
  raw: string,
  decimals: number,
  maxFractionDigits = 6,
): string {
  const formatted = formatEvmTokenAmount(raw, decimals);
  const [wholePart = "0", fractionPart] = formatted.split(".");

  if (!fractionPart || maxFractionDigits < 0) {
    return formatted;
  }

  const trimmedFraction = fractionPart.slice(0, maxFractionDigits).replace(/0+$/u, "");
  return trimmedFraction ? `${wholePart}.${trimmedFraction}` : wholePart;
}
