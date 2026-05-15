import { getExplorerTxUrl as getSharedExplorerTxUrl } from "@acorus/shared";

export function formatAddress(value: string): string {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatAmount(
  value: string | number,
  maximumFractionDigits = 4,
): string {
  const numeric = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return typeof value === "string" ? value : String(value);
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
  }).format(numeric);
}

export function getExplorerTxUrl(chainId: number, hash: string): string | null {
  try {
    return getSharedExplorerTxUrl(chainId, hash);
  } catch {
    return null;
  }
}
