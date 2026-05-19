import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import type {
  AssetRef,
  SendDraft,
  SendExecutionResult,
} from "@acorus/shared";
import {
  createSolanaConnection,
  toSolanaPublicKey,
  validateSolanaAddress,
} from "./client";
import { deriveSolanaKeypairFromMnemonic } from "./derive";
import { buildSolanaExplorerTxUrl } from "./explorer";

const SPL_TRANSFER_FEE_LAMPORTS = 10_000n;
const SPL_TRANSFER_WITH_ATA_FEE_LAMPORTS = 15_000n;

export type SplTransferDraftInput = {
  mintAddress: string;
  fromOwnerAddress: string;
  toOwnerAddress: string;
  amountRaw?: string;
  amountFormatted?: string;
  decimals: number;
  symbol?: string | null;
  balanceRaw?: string | bigint | null;
  estimatedFeeLamports?: string | bigint | null;
  recipientAtaExists?: boolean | null;
  rpcUrl?: string;
};

export type SplTransferDraft = SendDraft & {
  mintAddress: string;
  sourceAta: string | null;
  destinationAta: string | null;
  recipientAtaExists: boolean | null;
};

export type SplTransferExecutionInput = SplTransferDraftInput & {
  mnemonic: string;
  expectedFromAddress?: string | null;
};

export function validateSplTokenMint(address: string): boolean {
  return validateSolanaAddress(address);
}

export function validateSolanaOwnerAddress(address: string): boolean {
  return validateSolanaAddress(address);
}

export function getAssociatedTokenAddress(input: {
  mintAddress: string;
  ownerAddress: string;
}): string {
  return getAssociatedTokenAddressSync(
    toSolanaPublicKey(input.mintAddress),
    toSolanaPublicKey(input.ownerAddress),
  ).toBase58();
}

export async function checkAssociatedTokenAccountExists(input: {
  mintAddress: string;
  ownerAddress: string;
  rpcUrl?: string;
}): Promise<boolean> {
  const ata = getAssociatedTokenAddress(input);
  const connection = createSolanaConnection(input.rpcUrl);
  const account = await connection.getAccountInfo(toSolanaPublicKey(ata), "confirmed");
  return Boolean(account);
}

export async function estimateSplTransferFee(input: {
  recipientAtaExists?: boolean | null;
  estimatedFeeLamports?: string | bigint | null;
} = {}): Promise<bigint> {
  if (input.estimatedFeeLamports !== undefined && input.estimatedFeeLamports !== null) {
    return toBigInt(input.estimatedFeeLamports);
  }

  return input.recipientAtaExists === false
    ? SPL_TRANSFER_WITH_ATA_FEE_LAMPORTS
    : SPL_TRANSFER_FEE_LAMPORTS;
}

export async function buildSplTransferDraft(
  input: SplTransferDraftInput,
): Promise<SplTransferDraft> {
  const issues: SendDraft["issues"] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const mintValid = validateSplTokenMint(input.mintAddress);
  const fromValid = validateSolanaOwnerAddress(input.fromOwnerAddress);
  const toValid = validateSolanaOwnerAddress(input.toOwnerAddress);
  const decimalsValid = Number.isInteger(input.decimals)
    && input.decimals >= 0
    && input.decimals <= 18;
  const amountRaw = decimalsValid ? resolveTokenAmount(input) : 0n;
  let sourceAta: string | null = null;
  let destinationAta: string | null = null;
  let recipientAtaExists = input.recipientAtaExists ?? null;

  if (!mintValid) {
    errors.push("Invalid SPL token mint address.");
    issues.push({
      code: "invalid_mint",
      severity: "error",
      message: "SPL token mint must be a valid Solana address.",
    });
  }

  if (!fromValid) {
    errors.push("Invalid Solana sender address.");
    issues.push({
      code: "invalid_from_address",
      severity: "error",
      message: "Sender must be a valid Solana owner address.",
    });
  }

  if (!toValid) {
    errors.push("Invalid Solana recipient address.");
    issues.push({
      code: "invalid_to_address",
      severity: "error",
      message: "Recipient must be a valid Solana owner address.",
    });
  }

  if (!decimalsValid) {
    errors.push("Invalid SPL token decimals.");
    issues.push({
      code: "invalid_decimals",
      severity: "error",
      message: "SPL token decimals must be an integer from 0 to 18.",
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

  if (mintValid && fromValid) {
    sourceAta = getAssociatedTokenAddress({
      mintAddress: input.mintAddress,
      ownerAddress: input.fromOwnerAddress,
    });
  }

  if (mintValid && toValid) {
    destinationAta = getAssociatedTokenAddress({
      mintAddress: input.mintAddress,
      ownerAddress: input.toOwnerAddress,
    });

    if (recipientAtaExists === null) {
      try {
        recipientAtaExists = await checkAssociatedTokenAccountExists({
          mintAddress: input.mintAddress,
          ownerAddress: input.toOwnerAddress,
          rpcUrl: input.rpcUrl,
        });
      } catch {
        warnings.push("Recipient token account could not be checked before review.");
      }
    }
  }

  if (recipientAtaExists === false) {
    warnings.push("Recipient associated token account is missing; approval will create it before transfer.");
    issues.push({
      code: "recipient_ata_missing",
      severity: "warning",
      message: "Recipient associated token account will be created during execution.",
    });
  }

  if (input.balanceRaw !== undefined && input.balanceRaw !== null) {
    const balance = toBigInt(input.balanceRaw);
    if (balance < amountRaw) {
      errors.push("Insufficient SPL token balance.");
      issues.push({
        code: "insufficient_balance",
        severity: "error",
        message: "Token balance is not enough to cover the transfer amount.",
      });
    }
  } else {
    warnings.push("Token balance was not available during draft validation.");
  }

  const feeRaw = await estimateSplTransferFee({
    recipientAtaExists,
    estimatedFeeLamports: input.estimatedFeeLamports,
  });
  const asset = splAsset({
    mintAddress: input.mintAddress,
    symbol: input.symbol ?? "SPL",
    decimals: input.decimals,
  });

  return {
    family: "solana",
    chainId: 101,
    fromAddress: input.fromOwnerAddress,
    toAddress: input.toOwnerAddress,
    normalizedToAddress: toValid
      ? toSolanaPublicKey(input.toOwnerAddress).toBase58()
      : input.toOwnerAddress,
    asset,
    amountRaw: amountRaw.toString(),
    amountFormatted: formatTokenUnits(amountRaw, input.decimals),
    supportStatus: "supported",
    feeEstimate: {
      feeAsset: {
        family: "solana",
        chainId: 101,
        type: "native",
        symbol: "SOL",
        name: "Solana",
        decimals: 9,
        tokenAddress: null,
        isVerified: true,
      },
      feeRaw: feeRaw.toString(),
      feeFormatted: formatTokenUnits(feeRaw, 9),
      source: input.estimatedFeeLamports ? "estimated" : "fallback",
    },
    issues,
    warnings,
    errors,
    canProceed: errors.length === 0,
    canBroadcast: errors.length === 0,
    createdAt: new Date().toISOString(),
    mintAddress: input.mintAddress,
    sourceAta,
    destinationAta,
    recipientAtaExists,
  };
}

export async function executeSplTransfer(
  input: SplTransferExecutionInput,
): Promise<SendExecutionResult> {
  const keypair = deriveSolanaKeypairFromMnemonic({ mnemonic: input.mnemonic });
  const fromAddress = keypair.publicKey.toBase58();

  if (input.expectedFromAddress && input.expectedFromAddress.trim() !== fromAddress) {
    throw new Error("The requested Solana account does not match the unlocked wallet.");
  }

  if (input.fromOwnerAddress && input.fromOwnerAddress.trim() !== fromAddress) {
    throw new Error("The SPL send draft sender does not match the unlocked wallet.");
  }

  const draft = await buildSplTransferDraft({
    ...input,
    fromOwnerAddress: fromAddress,
  });

  if (!draft.canBroadcast || !draft.sourceAta || !draft.destinationAta) {
    throw new Error(draft.errors[0] ?? "SPL transfer draft is not broadcastable.");
  }

  const connection = createSolanaConnection(input.rpcUrl);
  const mint = toSolanaPublicKey(input.mintAddress);
  const destinationOwner = toSolanaPublicKey(input.toOwnerAddress);
  const sourceAta = toSolanaPublicKey(draft.sourceAta);
  const destinationAta = toSolanaPublicKey(draft.destinationAta);
  const sourceAccount = await connection.getAccountInfo(sourceAta, "confirmed");

  if (!sourceAccount) {
    throw new Error("Sender associated token account does not exist.");
  }

  const destinationAccount = await connection.getAccountInfo(destinationAta, "confirmed");
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: keypair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  });

  if (!destinationAccount) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        keypair.publicKey,
        destinationAta,
        destinationOwner,
        mint,
      ),
    );
  }

  transaction.add(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      keypair.publicKey,
      BigInt(draft.amountRaw),
      input.decimals,
    ),
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
    broadcastProvider: "solana_spl_rpc",
    submittedAt: new Date().toISOString(),
  };
}

function splAsset(input: {
  mintAddress: string;
  symbol: string;
  decimals: number;
}): AssetRef {
  return {
    family: "solana",
    chainId: 101,
    type: "spl",
    symbol: input.symbol || "SPL",
    name: input.symbol || "SPL Token",
    decimals: input.decimals,
    tokenAddress: input.mintAddress,
    isVerified: false,
  };
}

function resolveTokenAmount(input: Pick<
  SplTransferDraftInput,
  "amountRaw" | "amountFormatted" | "decimals"
>): bigint {
  if (input.amountRaw) {
    return toBigInt(input.amountRaw);
  }

  const formatted = input.amountFormatted?.trim() ?? "";
  if (!formatted || !/^\d+(\.\d+)?$/u.test(formatted)) {
    return 0n;
  }

  const [whole = "0", fraction = ""] = formatted.split(".");
  if (fraction.length > input.decimals) {
    return 0n;
  }

  return BigInt(whole) * 10n ** BigInt(input.decimals)
    + BigInt(fraction.padEnd(input.decimals, "0"));
}

function formatTokenUnits(value: bigint, decimals: number): string {
  const whole = value / 10n ** BigInt(decimals);
  const fraction = value % 10n ** BigInt(decimals);
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/u, "");

  return `${whole.toString()}${fractionText ? `.${fractionText}` : ""}`;
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
