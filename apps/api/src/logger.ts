import pino, { type DestinationStream, type LoggerOptions } from "pino";

export const sensitiveLogPaths = [
  "mnemonic",
  "seed",
  "seedPhrase",
  "privateKey",
  "passcode",
  "password",
  "encryptedVault",
  "signature",
  "rawTransaction",
  "body.mnemonic",
  "body.seed",
  "body.seedPhrase",
  "body.privateKey",
  "body.passcode",
  "body.password",
  "body.encryptedVault",
  "body.signature",
  "body.rawTransaction",
  "req.body.mnemonic",
  "req.body.seed",
  "req.body.seedPhrase",
  "req.body.privateKey",
  "req.body.passcode",
  "req.body.password",
  "req.body.encryptedVault",
  "req.body.signature",
  "req.body.rawTransaction",
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

export function buildLoggerOptions(level = "info"): LoggerOptions {
  return {
    level,
    redact: {
      paths: sensitiveLogPaths,
      censor: "[REDACTED]",
    },
  };
}

export function createLogger(
  options: LoggerOptions = {},
  destination?: DestinationStream,
) {
  return pino({
    ...buildLoggerOptions(typeof options.level === "string" ? options.level : "info"),
    ...options,
  }, destination);
}
