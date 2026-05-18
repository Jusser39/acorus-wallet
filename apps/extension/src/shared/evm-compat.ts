import type { ChainId } from "@acorus/shared";
import type { AcorusProviderMethod } from "./protocol";

export const EVM_COMPATIBILITY_METHODS = [
  "eth_requestAccounts",
  "eth_accounts",
  "eth_chainId",
  "web3_clientVersion",
  "net_version",
  "eth_coinbase",
  "wallet_getPermissions",
  "wallet_requestPermissions",
  "wallet_revokePermissions",
  "wallet_addEthereumChain",
  "wallet_switchEthereumChain",
  "wallet_watchAsset",
  "personal_sign",
  "eth_signTypedData_v4",
  "eth_signTransaction",
  "eth_sendTransaction",
] as const;

export type EvmCompatibilityMethod =
  (typeof EVM_COMPATIBILITY_METHODS)[number];

export type EvmProviderEventName =
  | "accountsChanged"
  | "chainChanged"
  | "connect"
  | "disconnect"
  | "message";

export type EvmProviderListener = (...args: unknown[]) => void;

export type EvmProviderRequestArguments = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

export type EvmJsonRpcRequest = {
  id?: string | number | null;
  jsonrpc?: "2.0";
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

export type EvmJsonRpcSuccessResponse = {
  id?: string | number | null;
  jsonrpc: "2.0";
  result: unknown;
};

export type EvmJsonRpcErrorResponse = {
  id?: string | number | null;
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
  };
};

export type EvmJsonRpcResponse =
  | EvmJsonRpcSuccessResponse
  | EvmJsonRpcErrorResponse;

export function isEvmCompatibilityMethod(
  value: string,
): value is EvmCompatibilityMethod {
  return (EVM_COMPATIBILITY_METHODS as readonly string[]).includes(value);
}

export function normalizeEvmRequestParams(
  value: unknown[] | Record<string, unknown> | undefined,
): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined) {
    return [];
  }

  return [value];
}

export function mapEvmMethodToAcorusMethod(
  method: EvmCompatibilityMethod,
): AcorusProviderMethod | null {
  switch (method) {
    case "eth_requestAccounts":
      return "acorus_requestAccounts";
    case "eth_accounts":
    case "eth_coinbase":
      return "acorus_accounts";
    case "eth_chainId":
    case "web3_clientVersion":
    case "net_version":
      return "acorus_chainId";
    case "wallet_getPermissions":
      return "acorus_getPermissions";
    case "wallet_requestPermissions":
      return "acorus_requestPermissions";
    case "wallet_revokePermissions":
      return "acorus_revokePermissions";
    case "wallet_addEthereumChain":
      return "acorus_addChain";
    case "wallet_switchEthereumChain":
      return "acorus_switchChain";
    case "wallet_watchAsset":
      return "acorus_watchAsset";
    case "personal_sign":
      return "acorus_signMessage";
    case "eth_signTypedData_v4":
      return "acorus_signTypedData";
    case "eth_signTransaction":
      return "acorus_signTransaction";
    case "eth_sendTransaction":
      return "acorus_sendTransaction";
    default:
      return null;
  }
}

export function formatEvmChainId(
  chainId: ChainId | null | undefined,
): string | null {
  const normalized = normalizeNumericChainId(chainId);

  if (normalized === null) {
    return null;
  }

  return `0x${normalized.toString(16)}`;
}

export function toNetVersion(
  chainId: ChainId | null | undefined,
): string | null {
  const normalized = normalizeNumericChainId(chainId);
  return normalized === null ? null : String(normalized);
}

export function parseEvmSwitchChainParameter(
  value: unknown[] | Record<string, unknown> | undefined,
): ChainId | null {
  const params = normalizeEvmRequestParams(value);
  const candidate = params[0];

  if (candidate && typeof candidate === "object" && "chainId" in candidate) {
    return parseChainId((candidate as { chainId?: unknown }).chainId);
  }

  return parseChainId(candidate);
}

export function coerceEvmAccounts(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function getEvmSelectedAccount(value: unknown): string | null {
  return coerceEvmAccounts(value)[0] ?? null;
}

function parseChainId(value: unknown): ChainId | null {
  const normalized = normalizeNumericChainId(value);
  return normalized === null ? null : normalized;
}

function normalizeNumericChainId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();

  if (/^0x[0-9a-f]+$/u.test(trimmed)) {
    return Number.parseInt(trimmed.slice(2), 16);
  }

  if (/^\d+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return null;
}
