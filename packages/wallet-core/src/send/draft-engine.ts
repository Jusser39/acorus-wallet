import type {
  AssetBalance,
  SendDraft,
  SendDraftInput,
  SendValidationIssue,
} from "@acorus/shared";
import { ChainAdapterRegistry } from "../adapters/registry";
import { normalizeSendAmount } from "./amount";
import {
  createIssue,
  splitIssues,
  validateSufficientBalance,
} from "./validation";

export type SendDraftEngineInput = SendDraftInput & {
  balance?: AssetBalance | null;
  rpcUrl?: string;
};

function uniqueMessages(items: string[]): string[] {
  return [...new Set(items)];
}

export class SendDraftEngine {
  constructor(private readonly registry: ChainAdapterRegistry) {}

  async createDraft(input: SendDraftEngineInput): Promise<SendDraft> {
    const adapter = this.registry.require({
      family: input.family,
      chainId: input.chainId,
    });

    const normalizedAmount = normalizeSendAmount({
      amountRaw: input.amountRaw,
      amountFormatted: input.amountFormatted,
      decimals: input.asset.decimals,
    });

    const issues: SendValidationIssue[] = [];

    if (!adapter.validateAddress(input.fromAddress)) {
      issues.push(
        createIssue({
          code: "invalid_from_address",
          severity: "error",
          message: "Invalid sender address for selected network.",
        }),
      );
    }

    if (!adapter.validateAddress(input.toAddress)) {
      issues.push(
        createIssue({
          code: "invalid_to_address",
          severity: "error",
          message: "Invalid recipient address for selected network.",
        }),
      );
    }

    const balanceIssue = validateSufficientBalance({
      balance: input.balance ?? null,
      amountRaw: normalizedAmount.amountRaw,
    });

    if (balanceIssue) {
      issues.push(balanceIssue);
    }

    if (!adapter.capabilities.sendDraft || !adapter.createSendDraft) {
      issues.push(
        createIssue({
          code: `${input.family}_send_not_implemented`,
          severity: input.family === "solana" ? "warning" : "error",
          message:
            input.family === "solana"
              ? "Solana send is coming soon. This network is not enabled for sending yet."
              : "Sending is not implemented for this network yet.",
        }),
      );

      const split = splitIssues(issues);

      return {
        family: input.family,
        chainId: input.chainId,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        normalizedToAddress: input.toAddress,
        asset: input.asset,
        amountRaw: normalizedAmount.amountRaw,
        amountFormatted: normalizedAmount.amountFormatted,
        supportStatus: input.family === "solana" ? "coming_soon" : "skeleton",
        feeEstimate: null,
        issues,
        warnings: split.warnings,
        errors: split.errors,
        canProceed: false,
        canBroadcast: false,
        createdAt: new Date().toISOString(),
      };
    }

    const adapterDraft = await adapter.createSendDraft({
      ...input,
      amountRaw: normalizedAmount.amountRaw,
      amountFormatted: normalizedAmount.amountFormatted,
    });

    const allIssues = [...issues, ...adapterDraft.issues];
    const split = splitIssues(allIssues);
    const canProceed =
      split.errors.length === 0
      && adapterDraft.supportStatus === "supported";

    return {
      ...adapterDraft,
      amountRaw: normalizedAmount.amountRaw,
      amountFormatted: normalizedAmount.amountFormatted,
      issues: allIssues,
      warnings: uniqueMessages([...adapterDraft.warnings, ...split.warnings]),
      errors: uniqueMessages([...adapterDraft.errors, ...split.errors]),
      canProceed,
      canBroadcast: canProceed && adapterDraft.canBroadcast,
      createdAt: adapterDraft.createdAt || new Date().toISOString(),
    };
  }
}
