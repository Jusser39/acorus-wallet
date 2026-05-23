import type { ExploreTokenItem } from "@acorus/shared";

export type FearGreedPulse = {
  score: number;
  label: "Extreme fear" | "Fear" | "Neutral" | "Greed" | "Extreme greed";
  averageChange24h: number | null;
  positiveCount: number;
  negativeCount: number;
  sampleSize: number;
};

export function buildFearGreedPulse(tokens: ExploreTokenItem[]): FearGreedPulse {
  const changes = tokens
    .map((token) => token.change24h)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!changes.length) {
    return {
      score: 50,
      label: "Neutral",
      averageChange24h: null,
      positiveCount: 0,
      negativeCount: 0,
      sampleSize: 0,
    };
  }

  const average = changes.reduce((sum, value) => sum + value, 0) / changes.length;
  const positiveCount = changes.filter((value) => value >= 0).length;
  const negativeCount = changes.length - positiveCount;
  const breadth = (positiveCount - negativeCount) / changes.length;
  const score = clamp(Math.round(50 + average * 4 + breadth * 22), 0, 100);

  return {
    score,
    label: labelForScore(score),
    averageChange24h: average,
    positiveCount,
    negativeCount,
    sampleSize: changes.length,
  };
}

function labelForScore(score: number): FearGreedPulse["label"] {
  if (score <= 20) return "Extreme fear";
  if (score <= 42) return "Fear";
  if (score <= 58) return "Neutral";
  if (score <= 78) return "Greed";
  return "Extreme greed";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
