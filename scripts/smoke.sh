#!/usr/bin/env bash
# Mode A smoke test: build, verify, run Playwright (which manages its own preview server).

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> build"
npm run build

echo "==> verify docs/index.html has a hashed module script"
test -f docs/index.html
grep -E '<script[^>]+type="module"[^>]+/castle-archive-memory-vault/assets/' docs/index.html >/dev/null \
  || (echo "docs/index.html missing the expected hashed asset script tag" && exit 2)

echo "==> kill stale preview servers on :4173"
if lsof -ti tcp:4173 >/dev/null 2>&1; then
  lsof -ti tcp:4173 | xargs kill 2>/dev/null || true
  sleep 1
fi

echo "==> Playwright (manages its own preview)"
npx playwright test

echo "==> smoke OK"
