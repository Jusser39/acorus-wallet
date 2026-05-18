import type { AcorusProviderMethod } from "../shared/protocol";

const DEFAULT_APPROVAL_WARNING =
  "Approval requires a second signer confirmation inside the extension before any signature or transaction result is returned.";
const ERC20_APPROVE_SELECTOR = "0x095ea7b3";
const ERC721_SET_APPROVAL_FOR_ALL_SELECTOR = "0xa22cb465";
const MAX_UINT256 = (1n << 256n) - 1n;

type TransactionLike = {
  to?: unknown;
  data?: unknown;
  value?: unknown;
};

export function buildApprovalRiskWarning(input: {
  method: AcorusProviderMethod;
  params: unknown[];
}): string {
  switch (input.method) {
    case "acorus_signMessage":
      return `${DEFAULT_APPROVAL_WARNING} Message signatures can be reused for login, delegation, or phishing flows, so verify the text and origin carefully.`;
    case "acorus_signTypedData":
      return buildTypedDataWarning(input.params);
    case "acorus_signTransaction":
    case "acorus_sendTransaction":
      return buildTransactionWarning(input.params);
    default:
      return DEFAULT_APPROVAL_WARNING;
  }
}

function buildTypedDataWarning(params: unknown[]): string {
  const typedData = extractTypedDataPayload(params);
  if (!typedData) {
    return `${DEFAULT_APPROVAL_WARNING} Typed data can authorize permits, approvals, or delegated actions, so verify the domain and contract carefully.`;
  }

  const domainName = getRecordString(typedData.domain, "name");
  const verifyingContract = getRecordString(
    typedData.domain,
    "verifyingContract",
  );
  const primaryType = getRecordString(typedData, "primaryType");
  const details = [
    primaryType ? `type ${primaryType}` : null,
    domainName ? `domain ${domainName}` : null,
    verifyingContract
      ? `verifying contract ${truncateAddress(verifyingContract)}`
      : null,
  ].filter(Boolean);

  return `${DEFAULT_APPROVAL_WARNING} Typed data can authorize permits, approvals, or delegated actions.${details.length ? ` Review ${details.join(", ")} carefully.` : ""}`;
}

function buildTransactionWarning(params: unknown[]): string {
  const transaction = extractTransaction(params);
  if (!transaction) {
    return `${DEFAULT_APPROVAL_WARNING} Review destination, native value, and calldata carefully before signing this transaction.`;
  }

  const details: string[] = [DEFAULT_APPROVAL_WARNING];
  const to = asString(transaction.to);
  const value = formatValue(transaction.value);
  const data = asString(transaction.data);

  if (to) {
    details.push(`Target ${truncateAddress(to)}.`);
  } else {
    details.push(
      "No destination address was provided, so this request may deploy a contract.",
    );
  }

  if (value) {
    details.push(`Native value ${value}.`);
  }

  if (data && isHexData(data)) {
    details.push(analyzeTransactionData(to, data));
  } else {
    details.push("No calldata detected; this looks like a direct native transfer.");
  }

  return details.join(" ");
}

function extractTypedDataPayload(params: unknown[]): Record<string, unknown> | null {
  for (const candidate of params) {
    if (isRecord(candidate) && isRecord(candidate.domain)) {
      return candidate;
    }
  }

  return null;
}

function extractTransaction(params: unknown[]): TransactionLike | null {
  const first = params[0];
  return isRecord(first) ? first : null;
}

function analyzeTransactionData(to: string | null, data: string): string {
  const selector = data.slice(0, 10).toLowerCase();

  if (selector === ERC20_APPROVE_SELECTOR) {
    const spender = decodeAddressArgument(data, 0);
    const amount = decodeUintArgument(data, 1);
    if (spender && amount !== null) {
      const allowance = amount === MAX_UINT256
        ? "unlimited token allowance"
        : `token allowance raw amount ${amount.toString()}`;

      return `Detected ERC-20 approve call: ${allowance} for spender ${truncateAddress(spender)}${to ? ` via contract ${truncateAddress(to)}` : ""}.`;
    }
  }

  if (selector === ERC721_SET_APPROVAL_FOR_ALL_SELECTOR) {
    const operator = decodeAddressArgument(data, 0);
    const enabled = decodeUintArgument(data, 1);
    if (operator && enabled !== null) {
      return `Detected NFT setApprovalForAll call: operator ${truncateAddress(operator)} will be ${enabled === 0n ? "removed" : "granted access to all matching assets"}${to ? ` on contract ${truncateAddress(to)}` : ""}.`;
    }
  }

  return `Contract calldata is present${to ? ` for ${truncateAddress(to)}` : ""}. Review the method, spender, and asset impact carefully before approving.`;
}

function decodeAddressArgument(data: string, index: number): string | null {
  const word = getAbiWord(data, index);
  if (!word) {
    return null;
  }

  return `0x${word.slice(24)}`;
}

function decodeUintArgument(data: string, index: number): bigint | null {
  const word = getAbiWord(data, index);
  if (!word) {
    return null;
  }

  return BigInt(`0x${word}`);
}

function getAbiWord(data: string, index: number): string | null {
  const body = data.slice(10);
  const start = index * 64;
  const word = body.slice(start, start + 64);
  return word.length === 64 ? word : null;
}

function formatValue(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }

  if (raw.startsWith("0x")) {
    try {
      return `${BigInt(raw).toString()} wei`;
    } catch {
      return truncate(raw, 24);
    }
  }

  return truncate(raw, 24);
}

function truncateAddress(value: string): string {
  return value.length <= 14 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isHexData(value: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(value) && value.length > 10;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRecordString(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : null;
}
