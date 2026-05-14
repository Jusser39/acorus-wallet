import pino, { type DestinationStream, type LoggerOptions } from "pino";

const redactedPaths = [
  "mnemonic",
  "seed",
  "seedPhrase",
  "privateKey",
  "passcode",
  "password",
  "encryptedVault",
  "signature",
  "rawTransaction",
  "*.mnemonic",
  "*.seed",
  "*.seedPhrase",
  "*.privateKey",
  "*.passcode",
  "*.password",
  "*.encryptedVault",
  "*.signature",
  "*.rawTransaction",
];

export function createLogger(
  options: LoggerOptions = {},
  destination?: DestinationStream,
) {
  return pino({
    level: "info",
    redact: {
      paths: redactedPaths,
      censor: "[REDACTED]",
    },
    ...options,
  }, destination);
}
