import type { AssetBalance, AssetRef, AssetType, ChainFamily, ChainId, ReceiveInfo } from "@acorus/shared";
import type { FiatCurrency, MarketPrice } from "@/lib/api";

export type UniversalAssetView = AssetBalance & {
  id: string;
  walletProfileId: string;
  displayChainId: number | string;
  displayFamily: ChainFamily;
  displayType: AssetType;
  price?: MarketPrice | null;
  fiatValue?: number | null;
  change24h?: { value: number; percent: number } | null;
  explorerUrl?: string | null;
  detailsHref?: string | null;
  canHide?: boolean;
  canSend?: boolean;
  isSkeleton?: boolean;
  warning?: string | null;
};

export type UniversalPortfolioView = {
  walletProfileId: string;
  family: ChainFamily;
  chainId: ChainId;
  address: string;
  currency: FiatCurrency;
  totalValue: number;
  change24h?: { value: number; percent: number } | null;
  assets: UniversalAssetView[];
  receiveInfo: ReceiveInfo;
  isSkeleton: boolean;
  warning?: string | null;
  updatedAt: string;
};

export function createUniversalAssetId(input: {
  family: ChainFamily;
  chainId: ChainId;
  tokenAddress?: string | null;
  symbol: string;
  type: AssetType;
}): string {
  return [
    input.family,
    String(input.chainId),
    input.type,
    (input.tokenAddress ?? "native").toLowerCase(),
    input.symbol.toUpperCase(),
  ].join(":");
}

export function getAssetTypeLabel(type: AssetType): string {
  switch (type) {
    case "native": return "Native";
    case "erc20": return "ERC-20";
    case "spl": return "SPL";
    case "trc20": return "TRC-20";
    case "utxo": return "UTXO";
    case "jetton": return "Jetton";
    default: return "Token";
  }
}

export function getChainFamilyLabel(family: ChainFamily): string {
  switch (family) {
    case "evm": return "EVM";
    case "solana": return "Solana";
    case "tron": return "Tron";
    case "utxo": return "Bitcoin";
    case "ton": return "TON";
    default: return family;
  }
}

export function isSkeletonFamily(family: ChainFamily): boolean {
  return family === "tron" || family === "utxo" || family === "ton";
}

export function getUnsupportedActionText(family: ChainFamily): string {
  if (family === "solana") return "Solana send available in the extension";
  if (family === "tron") return "Tron send not implemented";
  if (family === "utxo") return "Bitcoin send not implemented";
  if (family === "ton") return "TON send not implemented";
  return "Action not implemented";
}

export function toAssetRef(asset: UniversalAssetView): AssetRef {
  return {
    family: asset.family,
    chainId: asset.chainId,
    type: asset.type,
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals,
    tokenAddress: asset.tokenAddress ?? null,
    logoUrl: asset.logoUrl ?? null,
    isVerified: asset.isVerified,
  };
}
