import type { AssetBalance, AssetRef, ChainFamily, ChainId } from "@acorus/shared";
import { buildFallbackNativeAsset } from "./send-assets";
import { buildSendNetworkOptions } from "./send-networks";
import { createSwapAssetOption, type SwapAssetOption } from "./swap-ui";

function assetFromBalance(balance: AssetBalance): AssetRef {
  return {
    family: balance.family,
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

export function buildSwapAssetOptions(input: {
  portfolioAssets?: AssetBalance[];
  family: ChainFamily;
  chainId: ChainId;
}): SwapAssetOption[] {
  const network = buildSendNetworkOptions().find(
    (item) =>
      item.family === input.family &&
      String(item.chainId) === String(input.chainId),
  );

  const chainLabel = network?.label ?? String(input.chainId);
  const matching = (input.portfolioAssets ?? []).filter(
    (asset) =>
      asset.family === input.family &&
      String(asset.chainId) === String(input.chainId),
  );

  if (matching.length) {
    return matching.map((balance) =>
      createSwapAssetOption({
        asset: assetFromBalance(balance),
        chainLabel,
        balanceFormatted: balance.balanceFormatted,
      }),
    );
  }

  const fallback = buildFallbackNativeAsset({
    family: input.family,
    chainId: input.chainId,
    symbol: network?.nativeSymbol ?? "COIN",
  });

  return [
    createSwapAssetOption({
      asset: fallback,
      chainLabel,
      balanceFormatted: null,
    }),
  ];
}
