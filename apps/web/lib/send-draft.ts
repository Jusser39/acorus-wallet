import type {
  AssetBalance,
  AssetRef,
  ChainFamily,
  ChainId,
  SendDraft,
} from "@acorus/shared";
import {
  SendDraftEngine,
  createDefaultAdapterRegistry,
} from "@acorus/wallet-core";
import { getRpcUrlForUniversalChain } from "./universal-chains";

const registry = createDefaultAdapterRegistry();
const engine = new SendDraftEngine(registry);

export async function createUniversalSendDraft(input: {
  family: ChainFamily;
  chainId: ChainId;
  fromAddress: string;
  toAddress: string;
  asset: AssetRef;
  amountFormatted: string;
  balance?: AssetBalance | null;
}): Promise<SendDraft> {
  return engine.createDraft({
    family: input.family,
    chainId: input.chainId,
    fromAddress: input.fromAddress,
    toAddress: input.toAddress,
    asset: input.asset,
    amountFormatted: input.amountFormatted,
    balance: input.balance ?? null,
    rpcUrl: getRpcUrlForUniversalChain({
      family: input.family,
      chainId: input.chainId,
    }),
  });
}
