import type { Hash } from "viem";
import {
  TransactionReceiptNotFoundError,
  WaitForTransactionReceiptTimeoutError,
} from "viem";
import { createEvmPublicClient } from "./client";

export async function refreshTxStatus(
  chainId: number,
  txHash: Hash,
  env?: Record<string, string | undefined>,
): Promise<"pending" | "confirmed" | "failed" | "unknown"> {
  const client = createEvmPublicClient(chainId, env);

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    return receipt.status === "success" ? "confirmed" : "failed";
  } catch (error) {
    if (
      error instanceof TransactionReceiptNotFoundError ||
      error instanceof WaitForTransactionReceiptTimeoutError
    ) {
      return "pending";
    }

    throw error;
  }
}
