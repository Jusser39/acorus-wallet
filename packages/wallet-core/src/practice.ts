import type { PracticeTransaction } from "./types";

export function createPracticeTransaction(input: {
  symbol: string;
  amount: string;
  to: string;
}): PracticeTransaction {
  return {
    id: crypto.randomUUID(),
    symbol: input.symbol,
    amount: input.amount,
    to: input.to,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };
}
