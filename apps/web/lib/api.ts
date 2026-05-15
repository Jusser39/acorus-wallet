import type {
  ApiChainRecord,
  ChainFamily,
  ContactRecord,
  OnboardingProgressRecord,
  PreferredCurrency,
  TokenMetadata,
  TokenMetadataItem,
  TransactionAssetType,
  TransactionDirection,
  TransactionRecordItem,
  TransactionStatus,
  WalletProfileRecord,
  WalletProfileType,
} from "@acorus/shared";

export interface WalletProfileCreateInput {
  userId: string;
  name: string;
  type: WalletProfileType;
  publicAddress: string;
  chainFamily: ChainFamily;
  hiddenBalance?: boolean;
  preferredCurrency?: PreferredCurrency;
}

export interface WalletProfileUpdateInput {
  userId: string;
  name?: string;
  hiddenBalance?: boolean;
  preferredCurrency?: PreferredCurrency;
}

export interface ContactCreateInput {
  userId: string;
  name: string;
  address: string;
  chainFamily: ChainFamily;
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
  assetType: TransactionAssetType;
  tokenAddress?: string | null;
  symbol: string;
  amount: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  submittedAt: string;
  confirmedAt?: string | null;
  rawStatus?: string | null;
}

export interface OnboardingProgressInput {
  userId: string;
  step: string;
  completed: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

function getApiErrorMessage(status: number, payload: ApiErrorPayload | null): string {
  const code = payload?.error ?? payload?.message;

  switch (code) {
    case "validation_error":
      return "API validation failed.";
    case "not_found":
      return "Requested record was not found.";
    case "sensitive_fields_forbidden":
      return "Sensitive fields are not accepted by the API.";
    case "bad_request":
      return "The API rejected this request.";
    case "internal_error":
      return "The API failed to process the request.";
    default:
      return `API request failed (${status}).`;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const body = init?.body;
  const hasBody = body !== undefined && body !== null;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new Error(getApiErrorMessage(response.status, payload));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function createAnonymousUser(): Promise<{ id: string }> {
  return apiFetch("/api/users/anonymous", { method: "POST" });
}

export async function listWalletProfiles(
  userId: string,
): Promise<WalletProfileRecord[]> {
  const response = await apiFetch<{ items: WalletProfileRecord[] }>(
    `/api/wallet-profiles?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export const fetchWalletProfiles = listWalletProfiles;

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

export async function listContacts(userId: string): Promise<ContactRecord[]> {
  const response = await apiFetch<{ items: ContactRecord[] }>(
    `/api/contacts?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export const fetchContacts = listContacts;

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

export async function listTransactions(
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

export const fetchTransactions = listTransactions;

export async function createTransaction(
  input: TransactionCreateInput,
): Promise<TransactionRecordItem> {
  return apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTransactionStatus(
  id: string,
  userId: string,
): Promise<TransactionRecordItem> {
  return apiFetch(`/api/transactions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ userId }),
  });
}

export const refreshTransactionStatus = updateTransactionStatus;

export async function listChains(): Promise<ApiChainRecord[]> {
  const response = await apiFetch<{ items: ApiChainRecord[] }>("/api/chains");
  return response.items;
}

export async function listTokens(chainId: number): Promise<TokenMetadata[]> {
  const response = await apiFetch<{ items: TokenMetadataItem[] }>(
    `/api/tokens?chainId=${chainId}`,
  );
  return response.items;
}

export const fetchTokens = listTokens;

export async function getOnboardingProgress(
  userId: string,
): Promise<OnboardingProgressRecord[]> {
  const response = await apiFetch<{ items: OnboardingProgressRecord[] }>(
    `/api/onboarding-progress?userId=${encodeURIComponent(userId)}`,
  );
  return response.items;
}

export async function setOnboardingProgress(
  input: OnboardingProgressInput,
): Promise<OnboardingProgressRecord> {
  return apiFetch("/api/onboarding-progress", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
