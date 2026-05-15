import type {
  AssetBalance,
  AssetRef,
  ChainFamily,
  ChainId,
  SendDraft,
} from "@acorus/shared";

export type SendStep =
  | "compose"
  | "draft"
  | "review"
  | "unsupported"
  | "error";

export type SendAssetOption = {
  id: string;
  asset: AssetRef;
  balance?: AssetBalance | null;
  balanceFormatted?: string | null;
  fiatValue?: number | null;
  chainLabel: string;
  assetLabel: string;
  isNative: boolean;
  isSupportedForDraft: boolean;
};

export type SendNetworkOption = {
  id: string;
  family: ChainFamily;
  chainId: ChainId;
  label: string;
  nativeSymbol: string;
  isSkeleton: boolean;
  sendStatus: "supported" | "coming_soon" | "skeleton";
};

export type SendComposerState = {
  step: SendStep;
  family: ChainFamily;
  chainId: ChainId;
  assetOptionId: string;
  toAddress: string;
  amountFormatted: string;
  draft: SendDraft | null;
  error: string | null;
};

export function createSendAssetOptionId(input: {
  family: ChainFamily;
  chainId: ChainId;
  symbol: string;
  tokenAddress?: string | null;
}): string {
  return [
    input.family,
    String(input.chainId),
    input.symbol.toUpperCase(),
    (input.tokenAddress ?? "native").toLowerCase(),
  ].join(":");
}

export function getSendStatusLabel(status: SendNetworkOption["sendStatus"]): string {
  if (status === "supported") return "Send supported";
  if (status === "coming_soon") return "Coming soon";
  return "Skeleton";
}

export function canNetworkBroadcast(status: SendNetworkOption["sendStatus"]): boolean {
  return status === "supported";
}
