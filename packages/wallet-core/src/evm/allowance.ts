import type { Address, PublicClient } from "viem";
import { encodeFunctionData, getAddress, isAddress, maxUint256 } from "viem";
import { ERC20_ABI } from "./erc20Abi";

export type Erc20ApprovalMode = "exact" | "infinite";

export type Erc20ApproveTransactionInput = {
  chainId: number;
  tokenAddress: string;
  owner: string;
  spender: string;
  amountRaw: string;
  approvalMode: Erc20ApprovalMode;
};

export type Erc20ApproveTransaction = {
  chainId: number;
  from: Address;
  to: Address;
  data: `0x${string}`;
  value: "0x0";
  amountRaw: string;
  approvalMode: Erc20ApprovalMode;
  riskLabels: string[];
};

export function encodeErc20Approve(
  spender: string,
  amountRaw: string | bigint,
): `0x${string}` {
  const spenderAddress = assertEvmAddress(spender, "spender");
  const amount = parseUint256(amountRaw, "approval amount");

  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spenderAddress, amount],
  });
}

export function encodeErc20Allowance(
  owner: string,
  spender: string,
): `0x${string}` {
  const ownerAddress = assertEvmAddress(owner, "owner");
  const spenderAddress = assertEvmAddress(spender, "spender");

  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [ownerAddress, spenderAddress],
  });
}

export async function getErc20Allowance(
  publicClient: Pick<PublicClient, "readContract">,
  token: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  const tokenAddress = assertEvmAddress(token, "token");
  const ownerAddress = assertEvmAddress(owner, "owner");
  const spenderAddress = assertEvmAddress(spender, "spender");

  return publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [ownerAddress, spenderAddress],
  }) as Promise<bigint>;
}

export function buildErc20ApproveTransaction(
  input: Erc20ApproveTransactionInput,
): Erc20ApproveTransaction {
  const tokenAddress = assertEvmAddress(input.tokenAddress, "token");
  const owner = assertEvmAddress(input.owner, "owner");
  const spender = assertEvmAddress(input.spender, "spender");
  const requestedAmount = parseUint256(input.amountRaw, "approval amount");
  const amount = input.approvalMode === "infinite" ? maxUint256 : requestedAmount;
  const riskLabels = ["Token approval required"];

  if (input.approvalMode === "infinite") {
    riskLabels.push("Infinite approval");
  }

  riskLabels.push("Custom spender");

  return {
    chainId: input.chainId,
    from: owner,
    to: tokenAddress,
    data: encodeErc20Approve(spender, amount),
    value: "0x0",
    amountRaw: amount.toString(),
    approvalMode: input.approvalMode,
    riskLabels,
  };
}

export function shouldRequestErc20Allowance(input: {
  tokenAddress?: string | null;
  assetType?: string | null;
}): boolean {
  return Boolean(input.tokenAddress) && input.assetType !== "native";
}

function assertEvmAddress(value: string, label: string): Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid EVM ${label} address.`);
  }

  return getAddress(value);
}

function parseUint256(value: string | bigint, label: string): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error(`Invalid ${label}.`);
    }
    return value;
  }

  if (!/^\d+$/u.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return BigInt(value);
}
