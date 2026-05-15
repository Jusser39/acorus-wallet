import type { AssetBalance, AssetRef, ChainFamily, ChainId } from "@acorus/shared";
import type { WalletProfileRecord } from "@acorus/shared";
import type { PortfolioSummaryView } from "./portfolio";
import type { UniversalPortfolioView } from "./universal-assets";
import { createSendAssetOptionId, type SendAssetOption, type SendNetworkOption } from "./send-ui";

function toAssetRefFromBalance(balance: AssetBalance, fallbackFamily?: AssetBalance["family"]): AssetRef {
  return {
    family: balance.family ?? fallbackFamily ?? "evm",
    chainId: balance.chainId,
    type: balance.type,
    symbol: balance.symbol,
    name: balance.name,
    decimals: balance.decimals,
    tokenAddress: balance.tokenAddress ?? null,
    logoUrl: balance.logoUrl ?? null,
    isVerified: balance.isVerified,
  };
}

export function buildFallbackNativeAsset(input: {
  family: ChainFamily;
  chainId: ChainId;
  symbol: string;
}): AssetRef {
  const decimals =
    input.family === "solana"
      ? 9
      : input.family === "tron"
        ? 6
        : input.family === "utxo"
          ? 8
          : 18;

  return {
    family: input.family,
    chainId: input.chainId,
    type:
      input.family === "utxo"
        ? "utxo"
        : "native",
    symbol: input.symbol,
    name: input.symbol,
    decimals,
    tokenAddress: null,
    isVerified: true,
  };
}

export function buildSendAssetOptions(input: {
  profile: WalletProfileRecord;
  network: SendNetworkOption;
  portfolio: PortfolioSummaryView | UniversalPortfolioView | null;
}): SendAssetOption[] {
  // Both PortfolioSummaryView and UniversalPortfolioView have .assets,
  // but PortfolioAssetView (EVM-only) lacks `family`. Cast loosely and guard.
  const rawAssets = (input.portfolio?.assets ?? []) as unknown[];

  const networkAssets = rawAssets.filter((asset: any) => {
    // UniversalPortfolioView assets have family; PortfolioSummaryView assets don't
    const assetFamily: string | undefined = asset.family;
    const effectiveFamily = assetFamily ?? input.network.family;
    return (
      effectiveFamily === input.network.family &&
      String(asset.chainId) === String(input.network.chainId)
    );
  }) as AssetBalance[];

  if (networkAssets.length > 0) {
    return networkAssets.map((asset) => {
      const assetRef = toAssetRefFromBalance(asset, input.network.family);

      return {
        id: createSendAssetOptionId({
          family: assetRef.family,
          chainId: assetRef.chainId,
          symbol: assetRef.symbol,
          tokenAddress: assetRef.tokenAddress,
        }),
        asset: assetRef,
        balance: asset,
        balanceFormatted: (asset as any).balanceFormatted ?? null,
        fiatValue: (asset as any).fiatValue ?? null,
        chainLabel: input.network.label,
        assetLabel: `${assetRef.symbol} · ${assetRef.name}`,
        isNative: assetRef.type === "native" || assetRef.type === "utxo",
        isSupportedForDraft: true,
      };
    });
  }

  // Fallback: native asset placeholder when no portfolio loaded
  const fallback = buildFallbackNativeAsset({
    family: input.network.family,
    chainId: input.network.chainId,
    symbol: input.network.nativeSymbol || "COIN",
  });

  return [
    {
      id: createSendAssetOptionId({
        family: fallback.family,
        chainId: fallback.chainId,
        symbol: fallback.symbol,
        tokenAddress: fallback.tokenAddress,
      }),
      asset: fallback,
      balance: null,
      balanceFormatted: null,
      fiatValue: null,
      chainLabel: input.network.label,
      assetLabel: `${fallback.symbol} · ${fallback.name}`,
      isNative: true,
      isSupportedForDraft: true,
    },
  ];
}
