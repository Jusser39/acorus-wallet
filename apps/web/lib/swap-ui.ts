import type { AssetRef, ChainFamily, ChainId, SwapQuote } from "@acorus/shared";
import { createSendAssetOptionId } from "./send-ui";

export type SwapStep =
  | "compose"
  | "quote"
  | "review"
  | "unsupported"
  | "error";

export type SwapAssetOption = {
  id: string;
  asset: AssetRef;
  label: string;
  chainLabel: string;
  balanceFormatted?: string | null;
};

export type SwapComposerState = {
  step: SwapStep;
  fromFamily: ChainFamily;
  fromChainId: ChainId;
  fromAssetOptionId: string;
  toFamily: ChainFamily;
  toChainId: ChainId;
  toAssetOptionId: string;
  amountFormatted: string;
  slippageBps: number;
  quote: SwapQuote | null;
  error: string | null;
};

export function createSwapAssetOption(input: {
  asset: AssetRef;
  chainLabel: string;
  balanceFormatted?: string | null;
}): SwapAssetOption {
  return {
    id: createSendAssetOptionId({
      family: input.asset.family,
      chainId: input.asset.chainId,
      symbol: input.asset.symbol,
      tokenAddress: input.asset.tokenAddress,
    }),
    asset: input.asset,
    label: `${input.asset.symbol} · ${input.asset.name}`,
    chainLabel: input.chainLabel,
    balanceFormatted: input.balanceFormatted ?? null,
  };
}

export function isCrossChainSwap(input: {
  fromFamily: ChainFamily;
  fromChainId: ChainId;
  toFamily: ChainFamily;
  toChainId: ChainId;
}): boolean {
  return (
    input.fromFamily !== input.toFamily ||
    String(input.fromChainId) !== String(input.toChainId)
  );
}
