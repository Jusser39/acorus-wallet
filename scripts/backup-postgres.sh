#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"
ENV_FILE="${ROOT_DIR}/.env"
BACKUP_DIR="${ROOT_DIR}/backups/postgres"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_PATH="${BACKUP_DIR}/acorus-wallet-${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' > "${BACKUP_PATH}"

chmod 600 "${BACKUP_PATH}"

echo "[backup] saved ${BACKUP_PATH}"
