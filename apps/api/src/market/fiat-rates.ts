import { createLogger } from "../logger";

export type FiatRates = {
  base: string;
  rates: Record<string, number>;
  updatedAt: number;
};

let cachedRates: FiatRates | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getFiatRates(): Promise<FiatRates> {
  const now = Date.now();
  if (cachedRates && (now - cachedRates.updatedAt) < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      headers: { "Accept": "application/json" }
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch exchange rates: ${res.status}`);
    }

    const data = await res.json();
    if (data && data.base === "USD" && data.rates) {
      cachedRates = {
        base: "USD",
        rates: data.rates,
        updatedAt: now,
      };
      return cachedRates;
    }
    
    throw new Error("Invalid format from exchange rate API");
  } catch (error) {
    const logger = createLogger();
    logger.error("Failed to fetch fiat rates", { error });
    // Return stale cache if available
    if (cachedRates) {
      return cachedRates;
    }
    
    // Fallback dictionary for crucial currencies if everything fails
    return {
      base: "USD",
      rates: {
        USD: 1,
        EUR: 0.9,
        RUB: 90,
        GBP: 0.8,
      },
      updatedAt: now,
    };
  }
}
