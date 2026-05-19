const BASE = process.env.ACORUS_BASE || "https://24wallet.ru";

const USDC_MAINNET = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DUMMY_TAKER = process.env.SMOKE_TAKER || "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

function assertNoSecret(text) {
  const lower = text.toLowerCase();
  const forbidden = [
    "0x-api-key",
    "zerox_api_key",
    "privatekey",
    "mnemonic",
    "passcode",
    "seed phrase",
  ];

  for (const item of forbidden) {
    if (lower.includes(item)) {
      throw new Error(`Secret leak marker detected: ${item}`);
    }
  }
}

async function getJson(path) {
  const url = `${BASE}${path}`;
  const response = await fetch(url);
  const text = await response.text();

  assertNoSecret(text);

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(payload).slice(0, 500)}`);
  }

  return payload;
}

function qs(params) {
  return new URLSearchParams(params).toString();
}

async function main() {
  const status = await getJson("/api/swap/evm/status");
  console.log("status:", {
    provider: status.provider,
    approvalModel: status.approvalModel,
    configured: status.configured,
    enabled: status.enabled,
  });

  if (!status.configured) {
    throw new Error("0x provider is still not configured");
  }

  const price = await getJson(
    `/api/swap/evm/0x/price?${qs({
      chainId: "1",
      sellToken: "native",
      buyToken: USDC_MAINNET,
      sellAmount: "1000000000000000",
      taker: DUMMY_TAKER,
    })}`,
  );

  console.log("ETH->USDC price:", {
    provider: price.provider,
    mode: price.mode,
    chainId: price.chainId,
    sellAmountRaw: price.sellAmountRaw,
    buyAmountRaw: price.buyAmountRaw,
    price: price.price,
    liquidityAvailable: price.liquidityAvailable,
    route: price.routeSummary?.label,
  });

  if (!price.liquidityAvailable) {
    throw new Error("ETH->USDC price reports no liquidity");
  }

  const quote = await getJson(
    `/api/swap/evm/0x/quote?${qs({
      chainId: "1",
      sellToken: "native",
      buyToken: USDC_MAINNET,
      sellAmount: "1000000000000000",
      taker: DUMMY_TAKER,
    })}`,
  );

  console.log("ETH->USDC quote:", {
    provider: quote.provider,
    mode: quote.mode,
    chainId: quote.chainId,
    to: quote.to,
    hasData: Boolean(quote.data),
    value: quote.value,
    sellAmountRaw: quote.sellAmountRaw,
    buyAmountRaw: quote.buyAmountRaw,
    minBuyAmountRaw: quote.minBuyAmountRaw,
    approvalRequired: quote.approvalRequired,
    expiresAt: quote.expiresAt,
    route: quote.routeSummary?.label,
  });

  if (!quote.to || !quote.data) {
    throw new Error("Quote is missing executable tx fields");
  }

  const approvalQuote = await getJson(
    `/api/swap/evm/0x/quote?${qs({
      chainId: "1",
      sellToken: USDC_MAINNET,
      buyToken: WETH_MAINNET,
      sellAmount: "1000000",
      taker: DUMMY_TAKER,
    })}`,
  );

  console.log("USDC->WETH approval quote:", {
    provider: approvalQuote.provider,
    mode: approvalQuote.mode,
    approvalRequired: approvalQuote.approvalRequired,
    spender: approvalQuote.approval?.spender || approvalQuote.allowanceTarget,
    sellAmountRaw: approvalQuote.sellAmountRaw,
    buyAmountRaw: approvalQuote.buyAmountRaw,
    expiresAt: approvalQuote.expiresAt,
  });

  assertNoSecret(JSON.stringify([status, price, quote, approvalQuote]));
  console.log("0x live smoke: PASS");
}

main().catch((error) => {
  console.error("0x live smoke: FAIL");
  console.error(error.message);
  process.exit(1);
});
