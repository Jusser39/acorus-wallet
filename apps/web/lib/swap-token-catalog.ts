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
  chainId: number | string;
  tokenAddress?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
  source: "native" | "portfolio" | "curated" | "featured" | "volume_24h" | "crosschain";
  balanceFormatted?: string | null;
};

const TOKEN_LOGOS: Record<string, string> = {
  ARB: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  AAVE: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png",
  AERO: "https://assets.coingecko.com/coins/images/31745/small/token.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  BONK: "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
  BOME: "https://assets.coingecko.com/coins/images/36071/small/bome.png",
  BRETT: "https://assets.coingecko.com/coins/images/35529/small/1000050750.png",
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  CAKE: "https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png",
  CBBTC: "https://assets.coingecko.com/coins/images/40143/small/cbbtc.webp",
  CRV: "https://assets.coingecko.com/coins/images/12124/small/Curve.png",
  DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  DEGEN: "https://assets.coingecko.com/coins/images/34515/small/android-chrome-512x512.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  ENA: "https://assets.coingecko.com/coins/images/36530/small/ethena.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  FARTCOIN: "https://assets.coingecko.com/coins/images/50891/small/fart.jpg",
  JUP: "https://assets.coingecko.com/coins/images/34188/small/jup.png",
  JTO: "https://assets.coingecko.com/coins/images/33228/small/jto.png",
  KMNO: "https://assets.coingecko.com/coins/images/38370/small/kamino.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  LDO: "https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png",
  MEW: "https://assets.coingecko.com/coins/images/36440/small/MEW.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  ONDO: "https://assets.coingecko.com/coins/images/26580/small/ONDO.png",
  ORCA: "https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  PENDLE: "https://assets.coingecko.com/coins/images/15069/small/Pendle_Logo_Normal-03.png",
  PENGU: "https://assets.coingecko.com/coins/images/52622/small/PUDGY_PENGUINS_PENGU_PFP.png",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  PNUT: "https://assets.coingecko.com/coins/images/51301/small/pnut.png",
  POL: "https://assets.coingecko.com/coins/images/32440/small/polygon.png",
  POPCAT: "https://assets.coingecko.com/coins/images/33760/small/image.jpg",
  PYTH: "https://assets.coingecko.com/coins/images/31924/small/pyth.png",
  RAY: "https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg",
  SHIB: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  TON: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  TRUMP: "https://assets.coingecko.com/coins/images/53746/small/trump.png",
  TURBO: "https://assets.coingecko.com/coins/images/30154/small/TURBO.png",
  TRX: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  VVV: "https://assets.coingecko.com/coins/images/54023/small/VVV_Token_Logo.png",
  WAVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  WBTC: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
  WETH: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  WIF: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  ZEC: "https://assets.coingecko.com/coins/images/486/small/circle-zcash-color.png",
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
  token(1, "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", "AAVE", "Aave", 18),
  token(1, "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", "LDO", "Lido DAO", 18),
  token(1, "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", "SHIB", "Shiba Inu", 18),
  token(1, "0x57e114B691Db790C35207b2e685D4A43181e6061", "ENA", "Ethena", 18),
  token(1, "0xD533a949740bb3306d119CC777fa900bA034cd52", "CRV", "Curve DAO", 18),
  token(1, "0x808507121B80c02388fAd14726482e061B8da827", "PENDLE", "Pendle", 18),
  token(1, "0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3", "ONDO", "Ondo", 18),
  token(1, "0xA35923162C49cF95e6BF26623385eb431ad920D3", "TURBO", "Turbo", 18),
  token(1, "0x818Ba3343A1c4E34Ce0787e65F76239f804595E2", "NEIRO", "Neiro", 18),
  token(1, "0xcf0C122c6b73ff809C693DB761e7BebEbe0aB1a8", "FLOKI", "FLOKI", 18),
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
  token(8453, "0x940181a94A35A4569E4529A3CDfB74e38FD98631", "AERO", "Aerodrome", 18),
  token(8453, "0x4ed4E862860beD7a9570b96d89aF5E1B0Efefed3", "DEGEN", "Degen", 18),
  token(8453, "0x532f27101965dd16442E59d40670FaF5eBB142E4", "BRETT", "Brett", 18),
  token(8453, "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", "cbBTC", "Coinbase Wrapped BTC", 8, TOKEN_LOGOS.CBBTC),
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
  solanaToken("6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", "TRUMP", "Official Trump", 6),
  solanaToken("2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", "PENGU", "Pudgy Penguins", 6),
  solanaToken("7GCihgDB8fe29giZ2xTR8hypQVniJhux9mxUF6jjJ1h5", "POPCAT", "Popcat", 9),
  solanaToken("ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82", "BOME", "Book of Meme", 6),
  solanaToken("2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump", "PNUT", "Peanut the Squirrel", 6),
  solanaToken("JTOjtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", "JTO", "Jito", 9),
  solanaToken("orcaEKTdK7LKz57vaAYafShVWfydmmu7vpg6LaUuLk", "ORCA", "Orca", 6),
  solanaToken("KMNo3nJm4ZVLwvsvWNqfJmhhVPf3ZGBmuuQdshW3pE9", "KMNO", "Kamino", 6),
  solanaToken("9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", "FARTCOIN", "Fartcoin", 6),
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
  crosschainToken("DOGE.DOGE", "DOGE", "Dogecoin", 8),
  crosschainToken("TRON.TRX", "TRX", "TRON", 6),
  crosschainToken("TON.TON", "TON", "Toncoin", 9),
  crosschainToken("ZEC.ZEC", "ZEC", "Zcash", 8),
  crosschainToken("ETH.USDC", "USDC", "USDC on Ethereum", 6),
  crosschainToken("BSC.USDT", "USDT", "USDT on BNB Chain", 18),
  crosschainToken("BASE.USDC", "USDC", "USDC on Base", 6),
  crosschainToken("ARBITRUM.USDC", "USDC", "USDC on Arbitrum", 6),
  crosschainToken("SOL.USDC", "USDC", "USDC on Solana", 6),
];

export function getPopularSwapTokens(input: {
  chainId: number | string;
  portfolioAssets?: AssetBalance[];
  initialBuyToken?: string;
  initialBuyTokenMeta?: {
    symbol: string;
    name: string;
    decimals: number;
  };
}): SwapTokenOption[] {
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

  if (input.chainId === SOLANA_SWAP_CHAIN_ID) {
    const byValue = new Map<string, SwapTokenOption>();
    for (const item of [...SOLANA_VOLUME_TOKENS, ...initial]) {
      byValue.set(item.value.toLowerCase(), item);
    }
    return Array.from(byValue.values());
  }

  if (input.chainId === CROSS_CHAIN_SWAP_ID) {
    const byKey = new Map<string, SwapTokenOption>();

    for (const item of CROSS_CHAIN_TOKENS) {
      byKey.set(`${item.chainId}:${item.value.toLowerCase()}`, item);
    }

    for (const item of SOLANA_VOLUME_TOKENS) {
      byKey.set(`${item.chainId}:${item.value.toLowerCase()}`, item);
    }

    const tonToken: SwapTokenOption = { value: "TON.TON", symbol: "TON", name: "Toncoin", decimals: 9, chainId: "ton-mainnet", tokenAddress: null, logoUrl: TOKEN_LOGOS.TON, verified: true, source: "native" };
    const btcToken: SwapTokenOption = { value: "BTC.BTC", symbol: "BTC", name: "Bitcoin", decimals: 8, chainId: "bitcoin-mainnet", tokenAddress: null, logoUrl: TOKEN_LOGOS.BTC, verified: true, source: "native" };
    byKey.set(`ton-mainnet:ton.ton`, tonToken);
    byKey.set(`bitcoin-mainnet:btc.btc`, btcToken);

    const allCurated = EVM_CHAINS.flatMap(chain => getCuratedTokens(chain.chainId as number).map((item): SwapTokenOption => ({
      value: item.address,
      tokenAddress: item.address,
      symbol: item.symbol,
      name: item.name,
      decimals: item.decimals,
      chainId: item.chainId,
      logoUrl: item.logoUrl ?? TOKEN_LOGOS[item.symbol.toUpperCase()] ?? null,
      verified: item.verified,
      source: "curated",
    })));

    const allFeatured = FEATURED_EVM_TOKENS.map((item): SwapTokenOption => ({ ...item, source: "featured" }));

    for (const item of [...allCurated, ...allFeatured, ...initial]) {
      byKey.set(`${item.chainId}:${item.value.toLowerCase()}`, item);
    }

    return Array.from(byKey.values());
  }

  if (input.chainId === "ton-mainnet") {
    const tonToken: SwapTokenOption = {
      value: "native",
      symbol: "TON",
      name: "Toncoin",
      decimals: 9,
      chainId: "ton-mainnet",
      tokenAddress: null,
      logoUrl: TOKEN_LOGOS.TON,
      verified: true,
      source: "native",
    };
    return [tonToken];
  }

  if (input.chainId === "bitcoin-mainnet") {
    const btcToken: SwapTokenOption = {
      value: "native",
      symbol: "BTC",
      name: "Bitcoin",
      decimals: 8,
      chainId: "bitcoin-mainnet",
      tokenAddress: null,
      logoUrl: TOKEN_LOGOS.BTC,
      verified: true,
      source: "native",
    };
    return [btcToken];
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
  const curated = getCuratedTokens(input.chainId as number).map((item): SwapTokenOption => ({
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
  const byValue = new Map<string, SwapTokenOption>();

  for (const item of [native, ...portfolio, ...curated, ...featured, ...initial]) {
    byValue.set(item.value.toLowerCase(), item);
  }

  return Array.from(byValue.values());
}

export function getSwapNetworkLabel(chainId: number | string): string {
  if (chainId === SOLANA_SWAP_CHAIN_ID) {
    return "Solana";
  }

  if (chainId === CROSS_CHAIN_SWAP_ID) {
    return "Any network";
  }

  if (chainId === "ton-mainnet") return "TON";
  if (chainId === "bitcoin-mainnet") return "Bitcoin";

  return EVM_CHAINS.find((item) => item.chainId === chainId)?.name ?? "EVM";
}

export function getSwapProviderLabel(chainId: number | string): string {
  if (chainId === SOLANA_SWAP_CHAIN_ID) {
    return "Solana";
  }

  if (chainId === CROSS_CHAIN_SWAP_ID) {
    return "Universal";
  }

  return "EVM";
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
  chainId: number | string,
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
