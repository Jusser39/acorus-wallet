"use client";

export type WebSwapActivityEntry = {
  id: string;
  kind:
    | "approval_requested"
    | "approval_failed"
    | "swap_requested"
    | "swap_failed";
  provider: "0x";
  chainId: number;
  account: string;
  sellTokenSymbol?: string | null;
  buyTokenSymbol?: string | null;
  tokenSymbol?: string | null;
  amountFormatted?: string | null;
  buyAmountFormatted?: string | null;
  approvalMode?: "exact" | "infinite" | null;
  status: "queued" | "failed";
  createdAt: string;
  updatedAt: string;
  errorCode?: string | null;
  errorMessage?: string | null;
};

const SWAP_HISTORY_KEY = "acorus.swap.history";
const MAX_SWAP_HISTORY = 12;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadSwapHistory(): WebSwapActivityEntry[] {
  const raw = getStorage()?.getItem(SWAP_HISTORY_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as WebSwapActivityEntry[] : [];
  } catch {
    return [];
  }
}

export function appendSwapHistoryEntry(entry: WebSwapActivityEntry): WebSwapActivityEntry[] {
  const next = [entry, ...loadSwapHistory()].slice(0, MAX_SWAP_HISTORY);
  getStorage()?.setItem(SWAP_HISTORY_KEY, JSON.stringify(next));
  return next;
}
