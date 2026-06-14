"use client";

import { useEffect, useMemo } from "react";
import { useWalletStore } from "../store/wallet-store";
import { useFiatRatesStore } from "../store/fiat-rates-store";

export function useFormatter() {
  const displayCurrency = useWalletStore((state) => state.displayCurrency);
  const preferredLanguage = useWalletStore((state) => state.preferredLanguage);
  
  const rates = useFiatRatesStore((state) => state.rates);
  const fetchRates = useFiatRatesStore((state) => state.fetchRates);

  useEffect(() => {
    if (!rates) {
      fetchRates();
    }
  }, [rates, fetchRates]);

  const formatCurrency = useMemo(() => {
    return (value: number | null | undefined, forceUSD = false): string => {
      if (value == null) return "-";
      
      const currencyCode = forceUSD ? "USD" : (displayCurrency || "USD");
      let convertedValue = value;

      if (!forceUSD && currencyCode !== "USD" && rates?.rates[currencyCode]) {
        convertedValue = value * rates.rates[currencyCode];
      }

      // Format logic similar to original but localized
      if (convertedValue >= 1_000_000_000_000) {
        return new Intl.NumberFormat(preferredLanguage || "en-US", {
          style: "currency",
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(convertedValue / 1_000_000_000_000) + "T";
      }
      
      if (convertedValue >= 1_000_000) {
        return new Intl.NumberFormat(preferredLanguage || "en-US", {
          style: "currency",
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(convertedValue / 1_000_000) + "M";
      }

      return new Intl.NumberFormat(preferredLanguage || "en-US", {
        style: "currency",
        currency: currencyCode,
        ...(Math.abs(convertedValue) > 0 && Math.abs(convertedValue) < 0.01
          ? { maximumSignificantDigits: 4 }
          : { maximumFractionDigits: 2 }),
      }).format(convertedValue);
    };
  }, [displayCurrency, preferredLanguage, rates]);

  return { formatCurrency };
}
