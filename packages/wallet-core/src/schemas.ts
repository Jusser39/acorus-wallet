import { z } from "zod";

export const encryptedVaultSchema = z.object({
  version: z.literal(1),
  kdf: z.literal("pbkdf2-sha256"),
  iterations: z.number().int().positive(),
  saltBase64: z.string().min(1),
  ivBase64: z.string().min(1),
  ciphertextBase64: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const walletVaultPlaintextSchema = z.object({
  mnemonic: z.string().min(1),
  evmAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  createdAt: z.string().datetime(),
});
