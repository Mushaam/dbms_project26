#!/usr/bin/env bash
# Starter script for Museum Lifecycle (Linux / macOS)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Museum Artifact Lifecycle — starter"
echo "    Project: $ROOT"
echo

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is not installed or not on PATH." >&2
    exit 1
  fi
}

need node
need npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "Error: Node.js 18+ required (found $(node -v))." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "==> Created .env from .env.example — edit DB_PASSWORD (and other values) if needed."
else
  echo "==> Using existing .env"
fi

if [[ ! -d node_modules ]]; then
  echo "==> Installing npm dependencies..."
  npm install
else
  echo "==> Dependencies already installed"
fi

if [[ "${1:-}" == "--init-db" ]]; then
  need mysql
  echo "==> Loading schema: db/museum_lifecycle.sql"
  # Uses credentials from .env (DB_USER / DB_PASSWORD / DB_HOST / DB_PORT)
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
  export MYSQL_PWD="${DB_PASSWORD:-}"
  mysql \
    -h "${DB_HOST:-127.0.0.1}" \
    -P "${DB_PORT:-3306}" \
    -u "${DB_USER:-root}" \
    < db/museum_lifecycle.sql
  unset MYSQL_PWD
  echo "==> Database initialized."
fi

PORT="$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2- || true)"
PORT="${PORT:-3000}"

echo
echo "==> Starting server on http://localhost:${PORT}"
echo "    Login: admin / admin123"
echo "    Tip:   ./start.sh --init-db   # load schema + sample data once"
echo
exec npm start
