"use client";

import { create } from "zustand";
import { getFiatRates, type FiatRatesResponse } from "../lib/api";

interface FiatRatesState {
  rates: FiatRatesResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchRates: () => Promise<void>;
}

export const useFiatRatesStore = create<FiatRatesState>((set) => ({
  rates: null,
  isLoading: false,
  error: null,
  fetchRates: async () => {
    set({ isLoading: true, error: null });
    try {
      const rates = await getFiatRates();
      set({ rates, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },
}));
