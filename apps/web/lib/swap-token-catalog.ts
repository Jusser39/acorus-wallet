import {
  EVM_CHAINS,
  getCuratedTokens,
  type AssetBalance,
} from "@acorus/shared";

export const SOLANA_SWAP_CHAIN_ID = 101;
export const CROSS_CHAIN_SWAP_ID = 0;

export type SwapTokenOption = {
  value: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  tokenAddress?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
  source: "native" | "portfolio" | "curated" | "featured" | "volume_24h" | "crosschain";
  balanceFormatted?: string | null;
};

const TOKEN_LOGOS: Record<string, string> = {
  ARB: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  BONK: "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  CAKE: "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png",
  DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  JUP: "https://assets.coingecko.com/coins/images/34188/small/jup.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  POL: "https://assets.coingecko.com/coins/images/32440/small/polygon.png",
  PYTH: "https://assets.coingecko.com/coins/images/31924/small/pyth.png",
  RAY: "https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  VVV: "https://assets.coingecko.com/coins/images/54023/small/VVV_Token_Logo.png",
  WAVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  WBTC: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  WETH: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  WIF: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
};

const FEATURED_EVM_TOKENS: Array<Omit<SwapTokenOption, "source">> = [
  token(1, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "WETH", "Wrapped Ether", 18),
  token(1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "USDC", "USD Coin", 6),
  token(1, "0xdAC17F958D2ee523a2206206994597C13D831ec7", "USDT", "Tether USD", 6),
  token(1, "0x6B175474E89094C44Da98b954EedeAC495271d0F", "DAI", "Dai Stablecoin", 18),
  token(1, "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "UNI", "Uniswap", 18),
  token(1, "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "WBTC", "Wrapped Bitcoin", 8),
  token(1, "0x514910771AF9Ca656af840dff83E8264EcF986CA", "LINK", "Chainlink", 18),
  token(1, "0x6982508145454Ce325dDbE47a25d4ec3d2311933", "PEPE", "Pepe", 18),
  token(56, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "WBNB", "Wrapped BNB", 18),
  token(56, "0x55d398326f99059fF775485246999027B3197955", "USDT", "Tether USD", 18),
  token(56, "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "USDC", "USD Coin", 18),
  token(56, "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", "CAKE", "PancakeSwap", 18),
  token(137, "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "USDC.e", "USD Coin", 6, TOKEN_LOGOS.USDC),
  token(137, "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "USDT", "Tether USD", 6),
  token(137, "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "WETH", "Wrapped Ether", 18),
  token(137, "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", "WBTC", "Wrapped Bitcoin", 8),
  token(42161, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "WETH", "Wrapped Ether", 18),
  token(42161, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "USDC", "USD Coin", 6),
  token(42161, "0x912CE59144191C1204E64559FE8253a0e49E6548", "ARB", "Arbitrum", 18),
  token(42161, "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "WBTC", "Wrapped Bitcoin", 8),
  token(10, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18),
  token(10, "0x0b2C639c533813f4Aa9D7837CAF62653d097Ff85", "USDC", "USD Coin", 6),
  token(10, "0x4200000000000000000000000000000000000042", "OP", "Optimism", 18),
  token(8453, "0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18),
  token(8453, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USDC", "USD Coin", 6),
  token(8453, "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", "USDT", "Tether USD", 6),
  token(8453, "0xacFe6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf", "VVV", "Venice Token", 18),
  token(43114, "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", "WAVAX", "Wrapped AVAX", 18),
  token(43114, "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", "USDC", "USD Coin", 6),
  token(43114, "0x9702230A8Ea53601f5cD2dc00fDBC13d4dF4A8c7", "USDT", "Tether USD", 6),
  token(59144, "0xe5D7C2a44FfDDf6b295A15c148167daaAf5CF34f", "WETH", "Wrapped Ether", 18),
  token(59144, "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", "USDC", "USD Coin", 6),
];

const SOLANA_VOLUME_TOKENS: SwapTokenOption[] = [
  solanaToken("So11111111111111111111111111111111111111112", "SOL", "Solana", 9),
  solanaToken("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC", "USD Coin", 6),
  solanaToken("Es9vMFrzaCERmJfrF4H2FYD4KCoHcxR2FGP6RSk7mif", "USDT", "Tether USD", 6),
  solanaToken("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", "JUP", "Jupiter", 6),
  solanaToken("DezXAZ8z7PnrnRJjz3tKka7Dk2vn9EGzBchUbcM26G", "BONK", "Bonk", 5),
  solanaToken("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL8HknNkhcpump", "WIF", "dogwifhat", 6),
  solanaToken("4k3Dyjzvzp8eG6xKFbW1Zztyk4Rzrh4f4vWg4A8JcHh", "RAY", "Raydium", 6),
  solanaToken("HZ1JovNiVvGrGNiiYvEozEVgX3fgYy3XXqHwwFqB3X8", "PYTH", "Pyth Network", 6),
  solanaToken("7vfCXTUXxJ7vP63wCze8qMEt9UYc6tEpnHhV8qgC2Cr4", "WETH", "Wrapped Ether (Wormhole)", 8),
  solanaToken("3NZ9JMVBmGaKQCy9wKkaqf2c3pUYJRqkD7fWJmW5xVd", "WBTC", "Wrapped BTC (Wormhole)", 8),
];

const CROSS_CHAIN_TOKENS: SwapTokenOption[] = [
  crosschainToken("ETH.ETH", "ETH", "Ethereum", 18),
  crosschainToken("BSC.BNB", "BNB", "BNB Smart Chain", 18),
  crosschainToken("POLYGON.MATIC", "POL", "Polygon", 18),
  crosschainToken("ARBITRUM.ETH", "ETH", "Arbitrum ETH", 18),
  crosschainToken("BASE.ETH", "ETH", "Base ETH", 18),
  crosschainToken("AVAX_CCHAIN.AVAX", "AVAX", "Avalanche", 18),
  crosschainToken("SOL.SOL", "SOL", "Solana", 9),
  crosschainToken("BTC.BTC", "BTC", "Bitcoin", 8),
  crosschainToken("ETH.USDC", "USDC", "USDC on Ethereum", 6),
  crosschainToken("SOL.USDC", "USDC", "USDC on Solana", 6),
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
  if (input.chainId === SOLANA_SWAP_CHAIN_ID) {
    return SOLANA_VOLUME_TOKENS;
  }

  if (input.chainId === CROSS_CHAIN_SWAP_ID) {
    return CROSS_CHAIN_TOKENS;
  }

  const chain = EVM_CHAINS.find((item) => item.chainId === input.chainId) ?? EVM_CHAINS[0]!;
  const native: SwapTokenOption = {
    value: "native",
    symbol: chain.nativeSymbol,
    name: chain.name,
    decimals: 18,
    chainId: chain.chainId,
    tokenAddress: null,
    logoUrl: TOKEN_LOGOS[chain.nativeSymbol] ?? TOKEN_LOGOS.ETH,
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
      logoUrl: asset.logoUrl ?? TOKEN_LOGOS[asset.symbol.toUpperCase()] ?? null,
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
    logoUrl: item.logoUrl ?? TOKEN_LOGOS[item.symbol.toUpperCase()] ?? null,
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
        logoUrl: TOKEN_LOGOS[input.initialBuyTokenMeta.symbol.toUpperCase()] ?? null,
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

export function getSwapNetworkLabel(chainId: number): string {
  if (chainId === SOLANA_SWAP_CHAIN_ID) {
    return "Solana";
  }

  if (chainId === CROSS_CHAIN_SWAP_ID) {
    return "Cross-chain";
  }

  return EVM_CHAINS.find((item) => item.chainId === chainId)?.name ?? "EVM";
}

export function getSwapProviderLabel(chainId: number): string {
  if (chainId === SOLANA_SWAP_CHAIN_ID) {
    return "Jupiter";
  }

  if (chainId === CROSS_CHAIN_SWAP_ID) {
    return "Rango";
  }

  return "0x";
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
  logoUrl = TOKEN_LOGOS[symbol.toUpperCase()] ?? null,
): Omit<SwapTokenOption, "source"> {
  return {
    chainId,
    value: address,
    tokenAddress: address,
    symbol,
    name,
    decimals,
    logoUrl,
    verified: true,
  };
}

function solanaToken(
  mint: string,
  symbol: string,
  name: string,
  decimals: number,
): SwapTokenOption {
  return {
    chainId: SOLANA_SWAP_CHAIN_ID,
    value: mint,
    tokenAddress: mint,
    symbol,
    name,
    decimals,
    logoUrl: TOKEN_LOGOS[symbol.toUpperCase()] ?? null,
    verified: true,
    source: "volume_24h",
  };
}

function crosschainToken(
  asset: string,
  symbol: string,
  name: string,
  decimals: number,
  logoUrl = TOKEN_LOGOS[symbol.toUpperCase()] ?? null,
): SwapTokenOption {
  return {
    chainId: CROSS_CHAIN_SWAP_ID,
    value: asset,
    tokenAddress: asset,
    symbol,
    name,
    decimals,
    logoUrl,
    verified: true,
    source: "crosschain",
  };
}
