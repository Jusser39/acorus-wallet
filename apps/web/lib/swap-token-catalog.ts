import {
  EVM_CHAINS,
  getCuratedTokens,
  type AssetBalance,
} from "@acorus/shared";

export type SwapTokenOption = {
  value: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  tokenAddress?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
  source: "native" | "portfolio" | "curated" | "featured";
  balanceFormatted?: string | null;
};

const FEATURED_EVM_TOKENS: Array<Omit<SwapTokenOption, "source">> = [
  token(1, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "WETH", "Wrapped Ether", 18),
  token(1, "0x6B175474E89094C44Da98b954EedeAC495271d0F", "DAI", "Dai Stablecoin", 18),
  token(1, "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "UNI", "Uniswap", 18),
  token(1, "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "WBTC", "Wrapped Bitcoin", 8),
  token(1, "0x514910771AF9Ca656af840dff83E8264EcF986CA", "LINK", "Chainlink", 18),
  token(1, "0x6982508145454Ce325dDbE47a25d4ec3d2311933", "PEPE", "Pepe", 18),
  token(56, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "WBNB", "Wrapped BNB", 18),
  token(56, "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", "CAKE", "PancakeSwap", 18),
  token(137, "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "USDC.e", "USD Coin", 6),
  token(137, "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "USDT", "Tether USD", 6),
  token(137, "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "WETH", "Wrapped Ether", 18),
  token(137, "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", "WBTC", "Wrapped Bitcoin", 8),
  token(42161, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "WETH", "Wrapped Ether", 18),
  token(42161, "0x912CE59144191C1204E64559FE8253a0e49E6548", "ARB", "Arbitrum", 18),
  token(42161, "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "WBTC", "Wrapped Bitcoin", 8),
  token(10, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18),
  token(10, "0x4200000000000000000000000000000000000042", "OP", "Optimism", 18),
  token(8453, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18),
  token(8453, "0xacFe6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf", "VVV", "Venice Token", 18),
  token(43114, "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", "WAVAX", "Wrapped AVAX", 18),
  token(43114, "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", "USDC", "USD Coin", 6),
  token(43114, "0x9702230A8Ea53601f5cD2dc00fDBC13d4dF4A8c7", "USDT", "Tether USD", 6),
  token(59144, "0xe5D7C2a44FfDDf6b295A15c148167daaAf5CF34f", "WETH", "Wrapped Ether", 18),
  token(59144, "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", "USDC", "USD Coin", 6),
];

export function getPopularSwapTokens(input: {
  chainId: number;
  portfolioAssets?: AssetBalance[];
  initialBuyToken?: string;
  initialBuyTokenMeta?: {
    symbol: string;
    name: string;
    decimals: number;
  };
}): SwapTokenOption[] {
  const chain = EVM_CHAINS.find((item) => item.chainId === input.chainId) ?? EVM_CHAINS[0]!;
  const native: SwapTokenOption = {
    value: "native",
    symbol: chain.nativeSymbol,
    name: chain.name,
    decimals: 18,
    chainId: chain.chainId,
    tokenAddress: null,
    verified: true,
    source: "native",
  };
  const portfolio = (input.portfolioAssets ?? [])
    .filter((asset) => asset.family === "evm" && Number(asset.chainId) === input.chainId && asset.type === "erc20" && asset.tokenAddress)
    .map((asset): SwapTokenOption => ({
      value: asset.tokenAddress!,
      tokenAddress: asset.tokenAddress,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      chainId: input.chainId,
      verified: Boolean(asset.isVerified),
      source: "portfolio",
      balanceFormatted: asset.balanceFormatted,
    }));
  const curated = getCuratedTokens(input.chainId).map((item): SwapTokenOption => ({
    value: item.address,
    tokenAddress: item.address,
    symbol: item.symbol,
    name: item.name,
    decimals: item.decimals,
    chainId: item.chainId,
    logoUrl: item.logoUrl,
    verified: item.verified,
    source: "curated",
  }));
  const featured = FEATURED_EVM_TOKENS
    .filter((item) => item.chainId === input.chainId)
    .map((item): SwapTokenOption => ({ ...item, source: "featured" }));
  const initial = input.initialBuyToken && input.initialBuyToken !== "native" && input.initialBuyTokenMeta
    ? [{
        value: input.initialBuyToken,
        tokenAddress: input.initialBuyToken,
        symbol: input.initialBuyTokenMeta.symbol,
        name: input.initialBuyTokenMeta.name,
        decimals: input.initialBuyTokenMeta.decimals,
        chainId: input.chainId,
        verified: false,
        source: "featured" as const,
      }]
    : [];
  const byValue = new Map<string, SwapTokenOption>();

  for (const item of [native, ...portfolio, ...curated, ...featured, ...initial]) {
    byValue.set(item.value.toLowerCase(), item);
  }

  return Array.from(byValue.values());
}

export function filterSwapTokens(tokens: SwapTokenOption[], query: string): SwapTokenOption[] {
  const needle = query.trim().toLowerCase().slice(0, 80);

  if (!needle) {
    return tokens;
  }

  return tokens.filter((token) =>
    token.symbol.toLowerCase().includes(needle)
    || token.name.toLowerCase().includes(needle)
    || token.value.toLowerCase().includes(needle)
    || token.tokenAddress?.toLowerCase().includes(needle),
  );
}

function token(
  chainId: number,
  address: string,
  symbol: string,
  name: string,
  decimals: number,
): Omit<SwapTokenOption, "source"> {
  return {
    chainId,
    value: address,
    tokenAddress: address,
    symbol,
    name,
    decimals,
    verified: true,
  };
}
