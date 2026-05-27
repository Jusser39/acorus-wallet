import type { Address } from "viem";
import { getAddress, isAddress, maxUint256 } from "viem";
import {
  buildErc20ApproveTransaction,
  type Erc20ApproveTransaction,
} from "../evm/allowance";

export const DEFAULT_SWAP_SLIPPAGE_BPS = 50;
export const MAX_SWAP_SLIPPAGE_BPS = 500;
export const DEFAULT_ALLOWANCE_BUFFER_BPS = 0;
export const MAX_ALLOWANCE_BUFFER_BPS = 100;

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type SwapAllowanceAnalysis = {
  approvalRequired: boolean;
  resetRecommended: boolean;
  exactApprovalAmountRaw: string;
  bufferedApprovalAmountRaw: string;
  currentAllowanceRaw: string;
  requiredAllowanceRaw: string;
  warnings: string[];
  riskLabels: string[];
};

export type SwapApprovalTransaction = Erc20ApproveTransaction & {
  resetRecommended: boolean;
  currentAllowanceRaw: string;
  requiredAllowanceRaw: string;
  warnings: string[];
};

export function calculateSwapAllowanceAmount(input: {
  requiredAmountRaw: string | bigint;
  bufferBps?: number | null;
}): bigint {
  const requiredAmount = parsePositiveUint256(
    input.requiredAmountRaw,
    "required allowance amount",
  );
  const bufferBps = normalizeAllowanceBufferBps(input.bufferBps);

  if (bufferBps === 0) {
    return requiredAmount;
  }

  const buffered = requiredAmount + (requiredAmount * BigInt(bufferBps)) / 10_000n;

  if (buffered > maxUint256) {
    throw new Error("Buffered approval amount exceeds uint256.");
  }

  return buffered;
}

export function analyzeSwapAllowance(input: {
  currentAllowanceRaw?: string | bigint | null;
  requiredAmountRaw: string | bigint;
  bufferBps?: number | null;
}): SwapAllowanceAnalysis {
  const requiredAmount = parsePositiveUint256(
    input.requiredAmountRaw,
    "required allowance amount",
  );
  const currentAllowance = parseUint256OrZero(input.currentAllowanceRaw);
  const exactApprovalAmount = requiredAmount;
  const bufferedApprovalAmount = calculateSwapAllowanceAmount({
    requiredAmountRaw: requiredAmount,
    bufferBps: input.bufferBps,
  });
  const approvalRequired = currentAllowance < requiredAmount;
  const resetRecommended = currentAllowance > requiredAmount;
  const warnings: string[] = [];
  const riskLabels = ["Token approval required", "Exact approval"];

  if (approvalRequired) {
    warnings.push("A token approval is required before this swap can execute.");
  }

  if (resetRecommended) {
    warnings.push(
      "Existing allowance is higher than this swap needs. Consider resetting it after the swap.",
    );
  }

  if (currentAllowance === maxUint256) {
    warnings.push(
      "Existing allowance is unlimited. Resetting old approvals reduces future router risk.",
    );
    riskLabels.push("Previous unlimited approval");
  }

  if (bufferedApprovalAmount > exactApprovalAmount) {
    riskLabels.push("Buffered approval");
  }

  return {
    approvalRequired,
    resetRecommended,
    exactApprovalAmountRaw: exactApprovalAmount.toString(),
    bufferedApprovalAmountRaw: bufferedApprovalAmount.toString(),
    currentAllowanceRaw: currentAllowance.toString(),
    requiredAllowanceRaw: requiredAmount.toString(),
    warnings,
    riskLabels,
  };
}

export function buildSwapApprovalTransaction(input: {
  chainId: number;
  tokenAddress: string;
  owner: string;
  spender: string;
  requiredAmountRaw: string | bigint;
  bufferBps?: number | null;
  currentAllowanceRaw?: string | bigint | null;
}): SwapApprovalTransaction {
  const tokenAddress = assertEvmAddress(input.tokenAddress, "token");
  const owner = assertEvmAddress(input.owner, "owner");
  const spender = assertEvmAddress(input.spender, "spender");
  const analysis = analyzeSwapAllowance({
    currentAllowanceRaw: input.currentAllowanceRaw,
    requiredAmountRaw: input.requiredAmountRaw,
    bufferBps: input.bufferBps,
  });
  const tx = buildErc20ApproveTransaction({
    chainId: input.chainId,
    tokenAddress,
    owner,
    spender,
    amountRaw: analysis.bufferedApprovalAmountRaw,
    approvalMode: "exact",
  });

  return {
    ...tx,
    riskLabels: Array.from(new Set([...tx.riskLabels, ...analysis.riskLabels])),
    resetRecommended: analysis.resetRecommended,
    currentAllowanceRaw: analysis.currentAllowanceRaw,
    requiredAllowanceRaw: analysis.requiredAllowanceRaw,
    warnings: analysis.warnings,
  };
}

export function validateSwapSlippage(input: {
  quoteSlippageBps?: number | null;
  userMaxSlippageBps?: number | null;
  priceImpactBps?: number | null;
}): Result<{
  maxSlippageBps: number;
  quoteSlippageBps: number;
  priceImpactBps?: number | null;
}> {
  const maxSlippageBps = normalizeSlippageBps(input.userMaxSlippageBps);
  const quoteSlippageBps = normalizeSlippageBps(
    input.quoteSlippageBps ?? DEFAULT_SWAP_SLIPPAGE_BPS,
  );
  const priceImpactBps = normalizeOptionalBps(input.priceImpactBps);

  if (quoteSlippageBps > maxSlippageBps) {
    return {
      ok: false,
      error: new Error("Swap quote exceeds the configured slippage limit."),
    };
  }

  if (priceImpactBps !== null && priceImpactBps > maxSlippageBps) {
    return {
      ok: false,
      error: new Error("Swap price impact exceeds the configured slippage limit."),
    };
  }

  return {
    ok: true,
    value: {
      maxSlippageBps,
      quoteSlippageBps,
      priceImpactBps,
    },
  };
}

export function assertSwapQuoteWithinSlippage(input: {
  quoteSlippageBps?: number | null;
  userMaxSlippageBps?: number | null;
  priceImpactBps?: number | null;
}): {
  maxSlippageBps: number;
  quoteSlippageBps: number;
  priceImpactBps?: number | null;
} {
  const result = validateSwapSlippage(input);

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

function assertEvmAddress(value: string, label: string): Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid EVM ${label} address.`);
  }

  return getAddress(value);
}

function normalizeAllowanceBufferBps(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return DEFAULT_ALLOWANCE_BUFFER_BPS;
  }

  if (!Number.isInteger(value) || value < 0 || value > MAX_ALLOWANCE_BUFFER_BPS) {
    throw new Error("Invalid allowance buffer.");
  }

  return value;
}

function normalizeSlippageBps(value: number | null | undefined): number {
  if (value === null || value === undefined) {
    return DEFAULT_SWAP_SLIPPAGE_BPS;
  }

  if (!Number.isInteger(value) || value < 0 || value > MAX_SWAP_SLIPPAGE_BPS) {
    throw new Error("Invalid swap slippage.");
  }

  return value;
}

function normalizeOptionalBps(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Invalid basis-point value.");
  }

  return Math.ceil(value);
}

function parseUint256OrZero(value: string | bigint | null | undefined): bigint {
  if (value === null || value === undefined || value === "") {
    return 0n;
  }

  return parseUint256(value, "current allowance");
}

function parsePositiveUint256(value: string | bigint, label: string): bigint {
  const parsed = parseUint256(value, label);

  if (parsed <= 0n) {
    throw new Error(`Invalid ${label}.`);
  }

  return parsed;
}

function parseUint256(value: string | bigint, label: string): bigint {
  if (typeof value === "bigint") {
    if (value < 0n || value > maxUint256) {
      throw new Error(`Invalid ${label}.`);
    }

    return value;
  }

  const normalized = value.trim();

  if (!/^\d+$/u.test(normalized)) {
    throw new Error(`Invalid ${label}.`);
  }

  const parsed = BigInt(normalized);

  if (parsed > maxUint256) {
    throw new Error(`${label} exceeds uint256.`);
  }

  return parsed;
}
