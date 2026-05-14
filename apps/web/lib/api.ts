import type {
  ContactRecord,
  TokenMetadataItem,
  TransactionRecordItem,
  WalletProfileRecord,
} from "@acorus/shared";

export interface WalletProfileCreateInput {
  userId: string;
  name: string;
  type: "local" | "view_only" | "practice";
  publicAddress: string;
  chainFamily: "evm" | "solana" | "tron";
  hiddenBalance?: boolean;
  preferredCurrency?: "USD" | "EUR" | "RUB";
}

export interface WalletProfileUpdateInput {
  userId: string;
  name?: string;
  hiddenBalance?: boolean;
  preferredCurrency?: "USD" | "EUR" | "RUB";
}

export interface ContactCreateInput {
  userId: string;
  name: string;
  address: string;
  chainFamily: "evm" | "solana" | "tron";
  note?: string | null;
}

export type ContactUpdateInput = ContactCreateInput;

export interface TransactionCreateInput {
  userId: string;
  walletProfileId: string;
  chainId: number;
  hash: string;
  from: string;
  to: string;
  assetType: "native" | "erc20" | "nft" | "practice";
  tokenAddress?: string | null;
  symbol: string;
  amount: string;
  status: "pending" | "confirmed" | "failed" | "unknown";
  direction: "in" | "out" | "self";
  submittedAt: string;
  confirmedAt?: string | null;
  rawStatus?: string | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function createAnonymousUser(): Promise<{ id: string }> {
  return apiFetch("/api/users/anonymous", { method: "POST" });
}

export async function fetchWalletProfiles(
  userId: string,
): Promise<WalletProfileRecord[]> {
  const response = await apiFetch<{ items: WalletProfileRecord[] }>(
    `/api/wallet-profiles?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export async function createWalletProfile(
  input: WalletProfileCreateInput,
): Promise<WalletProfileRecord> {
  return apiFetch("/api/wallet-profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateWalletProfile(
  id: string,
  input: WalletProfileUpdateInput,
): Promise<WalletProfileRecord> {
  return apiFetch(`/api/wallet-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteWalletProfile(id: string, userId: string): Promise<void> {
  await apiFetch(`/api/wallet-profiles/${id}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function fetchContacts(userId: string): Promise<ContactRecord[]> {
  const response = await apiFetch<{ items: ContactRecord[] }>(
    `/api/contacts?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export async function createContact(
  input: ContactCreateInput,
): Promise<ContactRecord> {
  return apiFetch("/api/contacts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateContact(
  id: string,
  input: ContactUpdateInput,
): Promise<ContactRecord> {
  return apiFetch(`/api/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteContact(id: string, userId: string): Promise<void> {
  await apiFetch(`/api/contacts/${id}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function fetchTransactions(
  userId: string,
  walletProfileId?: string,
): Promise<TransactionRecordItem[]> {
  const search = new URLSearchParams({ userId });

  if (walletProfileId) {
    search.set("walletProfileId", walletProfileId);
  }

  const response = await apiFetch<{ items: TransactionRecordItem[] }>(
    `/api/transactions?${search.toString()}`,
  );
  return response.items;
}

export async function createTransaction(
  input: TransactionCreateInput,
): Promise<TransactionRecordItem> {
  return apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function refreshTransactionStatus(
  id: string,
  userId: string,
): Promise<TransactionRecordItem> {
  return apiFetch(`/api/transactions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  });
}

export async function fetchTokens(chainId: number): Promise<TokenMetadataItem[]> {
  const response = await apiFetch<{ items: TokenMetadataItem[] }>(
    `/api/tokens?chainId=${chainId}`,
  );
  return response.items;
}
