import { z } from "zod";
const solanaJupiterQuoteSchema = z.object({
  inputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u),
  outputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/u),
  amount: z.string().regex(/^[1-9][0-9]*$/u),
  slippageBps: z.coerce.number().int().min(0).max(10_000).optional(),
});
try {
  solanaJupiterQuoteSchema.parse({
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "DezXAZ8z7PnrnRJjz3tKka7Dk2vn9EGzBchUbcM26G",
    amount: "1000000000",
    slippageBps: 50
  });
  console.log("Success");
} catch(e) {
  console.log(e);
}
