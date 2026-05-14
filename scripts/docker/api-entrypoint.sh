#!/usr/bin/env bash
set -euo pipefail

echo "[api-entrypoint] starting Acorus Wallet API"

if [ "${ACORUS_ENABLE_PRISMA_STORE:-false}" = "true" ]; then
  echo "[api-entrypoint] Prisma store enabled"

  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[api-entrypoint] DATABASE_URL is required when ACORUS_ENABLE_PRISMA_STORE=true"
    exit 1
  fi

  echo "[api-entrypoint] waiting for PostgreSQL"

  node <<'NODE'
const net = require("node:net");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const host = parsed.hostname;
const port = Number(parsed.port || "5432");
const deadline = Date.now() + 90_000;

function wait() {
  const socket = net.createConnection({ host, port });

  socket.once("connect", () => {
    socket.end();
    process.exit(0);
  });

  socket.once("error", () => {
    socket.destroy();

    if (Date.now() > deadline) {
      console.error(`PostgreSQL is not reachable at ${host}:${port}`);
      process.exit(1);
    }

    setTimeout(wait, 1000);
  });
}

wait();
NODE

  echo "[api-entrypoint] running prisma generate"
  pnpm --filter @acorus/api prisma:generate

  echo "[api-entrypoint] applying prisma db push"
  pnpm --filter @acorus/api prisma:push

  echo "[api-entrypoint] Prisma is ready"
else
  echo "[api-entrypoint] Prisma store disabled, using MemoryStore"
fi

exec "$@"
