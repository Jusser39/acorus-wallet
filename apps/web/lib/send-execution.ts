// Client-side only. Never import from server components or backend.
// Seed/privateKey stay in frontend memory — never sent to the backend.

import type { SendDraft, SendExecutionResult } from "@acorus/shared";
import {
  SendExecutionEngine,
  createDefaultAdapterRegistry,
} from "@acorus/wallet-core";
import { getRpcUrlForUniversalChain } from "./universal-chains";

const registry = createDefaultAdapterRegistry();
const engine = new SendExecutionEngine(registry);

export async function executeUniversalSend(input: {
  draft: SendDraft;
  mnemonic?: string;
  privateKey?: string;
}): Promise<SendExecutionResult> {
  return engine.execute({
    draft: input.draft,
    mnemonic: input.mnemonic,
    privateKey: input.privateKey,
    rpcUrl: getRpcUrlForUniversalChain({
      family: input.draft.family,
      chainId: input.draft.chainId,
    }),
  });
}
