#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM_RESTORE:-no}" != "yes" ]; then
  echo "[restore] set CONFIRM_RESTORE=yes to continue"
  exit 1
fi

if [ $# -ne 1 ]; then
  echo "[restore] usage: CONFIRM_RESTORE=yes bash scripts/restore-postgres.sh <backup.sql|backup.dump>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"
ENV_FILE="${ROOT_DIR}/.env"
INPUT_PATH="$1"

if [ ! -f "${INPUT_PATH}" ]; then
  echo "[restore] backup file not found: ${INPUT_PATH}"
  exit 1
fi

SAFETY_BACKUP_OUTPUT="$(bash "${ROOT_DIR}/scripts/backup-postgres.sh")"
echo "${SAFETY_BACKUP_OUTPUT}"

case "${INPUT_PATH}" in
  *.sql)
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
      sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${INPUT_PATH}"
    ;;
  *.dump)
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
      sh -lc 'pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${INPUT_PATH}"
    ;;
  *)
    echo "[restore] unsupported file type: ${INPUT_PATH}"
    exit 1
    ;;
esac

echo "[restore] restore completed from ${INPUT_PATH}"
