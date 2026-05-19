import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type {
  AssetRef,
  SendDraft,
  SendExecutionResult,
} from "@acorus/shared";
import { createSolanaConnection, toSolanaPublicKey, validateSolanaAddress } from "./client";
import { deriveSolanaKeypairFromMnemonic } from "./derive";
import { buildSolanaExplorerTxUrl } from "./explorer";

const SOLANA_FALLBACK_FEE_LAMPORTS = 5_000n;

export type SolanaSendDraftInput = {
  fromAddress: string;
  toAddress: string;
  amountRaw?: string;
  amountFormatted?: string;
  balanceLamports?: string | bigint | null;
  estimatedFeeLamports?: string | bigint | null;
  rpcUrl?: string;
};

export type SolanaSendExecutionInput = SolanaSendDraftInput & {
  mnemonic: string;
  expectedFromAddress?: string | null;
};

export function solanaNativeAsset(): AssetRef {
  return {
    family: "solana",
    chainId: 101,
    type: "native",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    tokenAddress: null,
    isVerified: true,
  };
}

export async function createSolanaSendDraft(
  input: SolanaSendDraftInput,
): Promise<SendDraft> {
  const issues: SendDraft["issues"] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const amountRaw = resolveLamports(input);
  const feeRaw = input.estimatedFeeLamports !== undefined && input.estimatedFeeLamports !== null
    ? toBigInt(input.estimatedFeeLamports)
    : await resolveEstimatedFee(input.rpcUrl);

  if (!validateSolanaAddress(input.fromAddress)) {
    errors.push("Invalid Solana sender address.");
    issues.push({
      code: "invalid_from_address",
      severity: "error",
      message: "Sender must be a valid Solana address.",
    });
  }

  if (!validateSolanaAddress(input.toAddress)) {
    errors.push("Invalid Solana recipient address.");
    issues.push({
      code: "invalid_to_address",
      severity: "error",
      message: "Recipient must be a valid Solana address.",
    });
  }

  if (amountRaw <= 0n) {
    errors.push("Amount must be greater than zero.");
    issues.push({
      code: "invalid_amount",
      severity: "error",
      message: "Amount must be greater than zero.",
    });
  }

  if (input.balanceLamports !== undefined && input.balanceLamports !== null) {
    const balance = toBigInt(input.balanceLamports);
    if (balance < amountRaw + feeRaw) {
      errors.push("Insufficient SOL balance for amount and fee.");
      issues.push({
        code: "insufficient_balance",
        severity: "error",
        message: "SOL balance is not enough to cover the transfer and network fee.",
      });
    }
  } else {
    warnings.push("Balance was not available during draft validation.");
  }

  return {
    family: "solana",
    chainId: 101,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    normalizedToAddress: validateSolanaAddress(input.toAddress)
      ? toSolanaPublicKey(input.toAddress).toBase58()
      : input.toAddress,
    asset: solanaNativeAsset(),
    amountRaw: amountRaw.toString(),
    amountFormatted: formatLamports(amountRaw),
    supportStatus: "supported",
    feeEstimate: {
      feeAsset: solanaNativeAsset(),
      feeRaw: feeRaw.toString(),
      feeFormatted: formatLamports(feeRaw),
      source: "estimated",
    },
    issues,
    warnings,
    errors,
    canProceed: errors.length === 0,
    canBroadcast: errors.length === 0,
    createdAt: new Date().toISOString(),
  };
}

export async function executeSolanaSend(
  input: SolanaSendExecutionInput,
): Promise<SendExecutionResult> {
  const keypair = deriveSolanaKeypairFromMnemonic({ mnemonic: input.mnemonic });
  const fromAddress = keypair.publicKey.toBase58();

  if (
    input.expectedFromAddress
    && input.expectedFromAddress.trim() !== fromAddress
  ) {
    throw new Error("The requested Solana account does not match the unlocked wallet.");
  }

  if (input.fromAddress && input.fromAddress.trim() !== fromAddress) {
    throw new Error("The Solana send draft sender does not match the unlocked wallet.");
  }

  const draft = await createSolanaSendDraft({
    ...input,
    fromAddress,
  });

  if (!draft.canBroadcast) {
    throw new Error(draft.errors[0] ?? "Solana send draft is not broadcastable.");
  }

  const connection = createSolanaConnection(input.rpcUrl);
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: keypair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: toSolanaPublicKey(draft.normalizedToAddress ?? input.toAddress),
      lamports: BigInt(draft.amountRaw),
    }),
  );

  transaction.sign(keypair);
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  return {
    family: "solana",
    chainId: 101,
    status: "submitted",
    txHash: signature,
    explorerUrl: buildSolanaExplorerTxUrl(signature),
    errorCode: null,
    errorMessage: null,
    broadcastProvider: "solana_rpc",
    submittedAt: new Date().toISOString(),
  };
}

export function parseSolanaAmountToLamports(input: {
  amountRaw?: string;
  amountFormatted?: string;
}): bigint {
  return resolveLamports(input);
}

export function formatLamports(value: bigint): string {
  const whole = value / BigInt(LAMPORTS_PER_SOL);
  const fraction = value % BigInt(LAMPORTS_PER_SOL);
  const fractionText = fraction
    .toString()
    .padStart(9, "0")
    .replace(/0+$/u, "");

  return `${whole.toString()}${fractionText ? `.${fractionText}` : ""}`;
}

async function resolveEstimatedFee(rpcUrl?: string): Promise<bigint> {
  try {
    const connection = createSolanaConnection(rpcUrl);
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const message = new Transaction({
      feePayer: toSolanaPublicKey("11111111111111111111111111111111"),
      recentBlockhash: blockhash,
    }).compileMessage();
    const fee = await connection.getFeeForMessage(message, "confirmed");
    return BigInt(fee.value ?? Number(SOLANA_FALLBACK_FEE_LAMPORTS));
  } catch {
    return SOLANA_FALLBACK_FEE_LAMPORTS;
  }
}

function resolveLamports(input: Pick<SolanaSendDraftInput, "amountRaw" | "amountFormatted">): bigint {
  if (input.amountRaw) {
    return toBigInt(input.amountRaw);
  }

  const formatted = input.amountFormatted?.trim() ?? "";
  if (!formatted) {
    return 0n;
  }

  if (!/^\d+(\.\d{0,9})?$/u.test(formatted)) {
    return 0n;
  }

  const [whole = "0", fraction = ""] = formatted.split(".");
  return BigInt(whole) * BigInt(LAMPORTS_PER_SOL)
    + BigInt(fraction.padEnd(9, "0"));
}

function toBigInt(value: string | bigint): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (/^\d+$/u.test(value)) {
    return BigInt(value);
  }

  return 0n;
}
