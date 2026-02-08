#!/usr/bin/env bash
# Thin wrapper around dbmate that builds the DATABASE_URL from your env file
# and points it at the host-mapped postgres port.
#
# Usage:
#   ./migrate.sh            — apply pending migrations
#   ./migrate.sh up         — same as above
#   ./migrate.sh down       — rollback last migration
#   ./migrate.sh status     — show applied / pending
#   ./migrate.sh <anything> — passed straight through to dbmate

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.development}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found at $ENV_FILE"
  echo "Set ENV_FILE to point to your env file."
  exit 1
fi

# shellcheck source=/dev/null
source <(grep -E '^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB|DB_PORT)=' "$ENV_FILE")

export DATABASE_URL="postgres://${POSTGRES_USER:-koji}:${POSTGRES_PASSWORD}@localhost:${DB_PORT:-5432}/${POSTGRES_DB:-movies}?sslmode=disable"
export DBMATE_MIGRATIONS_DIR="$SCRIPT_DIR/db/migrations"
export DBMATE_NO_CREATE=true

exec dbmate "${@:-up}"
