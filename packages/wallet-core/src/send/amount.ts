export function parseDecimalAmountToRaw(input: {
  amountFormatted: string;
  decimals: number;
}): string {
  const value = input.amountFormatted.trim();

  if (!value) {
    throw new Error("amount_required");
  }

  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("amount_invalid");
  }

  const [whole, fraction = ""] = value.split(".");

  if (fraction.length > input.decimals) {
    throw new Error("amount_too_many_decimals");
  }

  const paddedFraction = fraction.padEnd(input.decimals, "0");
  const raw = `${whole}${paddedFraction}`.replace(/^0+/, "") || "0";

  if (raw === "0") {
    throw new Error("amount_must_be_positive");
  }

  return raw;
}

export function formatRawAmount(input: {
  amountRaw: string;
  decimals: number;
}): string {
  const raw = input.amountRaw.trim();

  if (!/^\d+$/.test(raw)) {
    throw new Error("raw_amount_invalid");
  }

  if (input.decimals === 0) {
    return raw;
  }

  const padded = raw.padStart(input.decimals + 1, "0");
  const whole = padded.slice(0, -input.decimals) || "0";
  const fraction = padded.slice(-input.decimals).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

export function normalizeSendAmount(input: {
  amountRaw?: string;
  amountFormatted?: string;
  decimals: number;
}): {
  amountRaw: string;
  amountFormatted: string;
} {
  if (input.amountRaw) {
    return {
      amountRaw: input.amountRaw,
      amountFormatted: formatRawAmount({
        amountRaw: input.amountRaw,
        decimals: input.decimals,
      }),
    };
  }

  if (input.amountFormatted) {
    const amountRaw = parseDecimalAmountToRaw({
      amountFormatted: input.amountFormatted,
      decimals: input.decimals,
    });

    return {
      amountRaw,
      amountFormatted: input.amountFormatted,
    };
  }

  throw new Error("amount_required");
}

export function compareRawAmounts(a: string, b: string): number {
  const left = BigInt(a);
  const right = BigInt(b);

  if (left > right) return 1;
  if (left < right) return -1;

  return 0;
}
