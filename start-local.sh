#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Erreur : installez Node.js 22.12+ (ou 20.19+) puis relancez ce script." >&2
  exit 1
fi

if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19) ? 0 : 1)'; then
  echo "Erreur : Linux Lab exige Node.js 20.19+ ou 22.12+." >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1 && ! command -v pnpm >/dev/null 2>&1; then
  echo "Erreur : installez Corepack (fourni avec Node.js) ou pnpm 10.18.0." >&2
  exit 1
fi

run_pnpm() {
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  else
    pnpm "$@"
  fi
}

if [ ! -x node_modules/.bin/tsx ]; then
  echo "Installation des dépendances du projet…"
  run_pnpm install --frozen-lockfile
fi

export NODE_ENV=development
export PORT="${PORT:-3000}"
echo "Linux Lab démarre sur http://localhost:${PORT} — Ctrl+C pour arrêter."
exec node_modules/.bin/tsx watch server/_core/index.ts
