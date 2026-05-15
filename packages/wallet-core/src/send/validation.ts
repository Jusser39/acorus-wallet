import type { AssetBalance, SendValidationIssue } from "@acorus/shared";
import { compareRawAmounts } from "./amount";

export function createIssue(input: {
  code: string;
  severity: SendValidationIssue["severity"];
  message: string;
}): SendValidationIssue {
  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
  };
}

export function splitIssues(issues: SendValidationIssue[]): {
  warnings: string[];
  errors: string[];
} {
  return {
    warnings: issues
      .filter((issue) => issue.severity === "warning")
      .map((issue) => issue.message),
    errors: issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message),
  };
}

export function validateSufficientBalance(input: {
  balance: AssetBalance | null;
  amountRaw: string;
}): SendValidationIssue | null {
  if (!input.balance) {
    return createIssue({
      code: "balance_unavailable",
      severity: "warning",
      message:
        "Balance is unavailable. The draft can be reviewed, but balance check could not be completed.",
    });
  }

  if (compareRawAmounts(input.amountRaw, input.balance.balanceRaw) > 0) {
    return createIssue({
      code: "insufficient_balance",
      severity: "error",
      message: "Insufficient balance for this transfer.",
    });
  }

  return null;
}
