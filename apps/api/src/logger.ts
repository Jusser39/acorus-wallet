import pino, { type DestinationStream, type LoggerOptions } from "pino";

export const sensitiveLogPaths = [
  "mnemonic",
  "seed",
  "seedPhrase",
  "privateKey",
  "passcode",
  "password",
  "DATABASE_URL",
  "POSTGRES_PASSWORD",
  "authorization",
  "cookie",
  "encryptedVault",
  "signature",
  "rawTransaction",
  "headers.authorization",
  "headers.cookie",
  "headers[\"set-cookie\"]",
  "body.mnemonic",
  "body.seed",
  "body.seedPhrase",
  "body.privateKey",
  "body.passcode",
  "body.password",
  "body.DATABASE_URL",
  "body.POSTGRES_PASSWORD",
  "body.authorization",
  "body.cookie",
  "body.encryptedVault",
  "body.signature",
  "body.rawTransaction",
  "req.body.mnemonic",
  "req.body.seed",
  "req.body.seedPhrase",
  "req.body.privateKey",
  "req.body.passcode",
  "req.body.password",
  "req.body.DATABASE_URL",
  "req.body.POSTGRES_PASSWORD",
  "req.body.encryptedVault",
  "req.body.signature",
  "req.body.rawTransaction",
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers[\"set-cookie\"]",
  "res.headers.authorization",
  "res.headers.cookie",
  "res.headers[\"set-cookie\"]",
  "*.mnemonic",
  "*.seed",
  "*.seedPhrase",
  "*.privateKey",
  "*.passcode",
  "*.password",
  "*.DATABASE_URL",
  "*.POSTGRES_PASSWORD",
  "*.authorization",
  "*.cookie",
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
