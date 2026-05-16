import type { SendDraft, SendExecutionResult } from "@acorus/shared";
import type { ChainAdapterRegistry } from "../adapters/registry";
import type { BroadcastSendInput } from "../adapters/types";

export type SendExecutionEngineInput = {
  draft: SendDraft;
  mnemonic?: string;
  privateKey?: string;
  rpcUrl?: string;
};

export class SendExecutionEngine {
  constructor(private readonly registry: ChainAdapterRegistry) {}

  async execute(input: SendExecutionEngineInput): Promise<SendExecutionResult> {
    const adapter = this.registry.require({
      family: input.draft.family,
      chainId: input.draft.chainId,
    });

    if (
      !input.draft.canBroadcast ||
      !adapter.capabilities.broadcast ||
      !adapter.broadcastSend
    ) {
      return {
        family: input.draft.family,
        chainId: input.draft.chainId,
        status: "unsupported",
        txHash: null,
        explorerUrl: null,
        errorCode: "broadcast_not_supported",
        errorMessage: "Broadcast is not supported for this network adapter yet.",
        broadcastProvider: null,
        submittedAt: new Date().toISOString(),
      };
    }

    if (input.draft.errors.length > 0) {
      return {
        family: input.draft.family,
        chainId: input.draft.chainId,
        status: "rejected",
        txHash: null,
        explorerUrl: null,
        errorCode: "draft_has_errors",
        errorMessage: input.draft.errors.join("; "),
        broadcastProvider: null,
        submittedAt: new Date().toISOString(),
      };
    }

    const broadcastInput: BroadcastSendInput = {
      draft: input.draft,
      mnemonic: input.mnemonic,
      privateKey: input.privateKey,
      rpcUrl: input.rpcUrl,
    };

    try {
      return await adapter.broadcastSend(broadcastInput);
    } catch (error) {
      return {
        family: input.draft.family,
        chainId: input.draft.chainId,
        status: "failed",
        txHash: null,
        explorerUrl: null,
        errorCode: "broadcast_failed",
        errorMessage:
          error instanceof Error ? error.message : "Broadcast failed.",
        broadcastProvider: null,
        submittedAt: new Date().toISOString(),
      };
    }
  }
}
