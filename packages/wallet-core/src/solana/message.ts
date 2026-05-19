import nacl from "tweetnacl";
import { deriveSolanaKeypairFromMnemonic } from "./derive";

export function signSolanaMessage(input: {
  mnemonic: string;
  message: string | number[] | Uint8Array;
}): string {
  const keypair = deriveSolanaKeypairFromMnemonic({
    mnemonic: input.mnemonic,
  });
  const messageBytes = normalizeMessage(input.message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

  return bytesToBase64(signature);
}

function normalizeMessage(message: string | number[] | Uint8Array): Uint8Array {
  if (typeof message === "string") {
    return new TextEncoder().encode(message);
  }

  if (message instanceof Uint8Array) {
    return message;
  }

  return Uint8Array.from(message);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
