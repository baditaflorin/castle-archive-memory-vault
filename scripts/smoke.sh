#!/usr/bin/env bash
# Mode A smoke test: build, serve as Pages, run Playwright happy-path.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> build"
npm run build

echo "==> verify docs/index.html exists and has a hashed module script"
test -f docs/index.html
grep -E '<script[^>]+type="module"[^>]+/castle-archive-memory-vault/assets/' docs/index.html >/dev/null \
  || (echo "docs/index.html missing the expected hashed asset script tag" && exit 2)

echo "==> install Playwright browsers if needed"
if ! npx --no-install playwright --version >/dev/null 2>&1; then
  npm exec -- playwright install --with-deps chromium >/dev/null
else
  npx playwright install chromium >/dev/null
fi

echo "==> kill any stale preview on :4173"
if lsof -ti tcp:4173 >/dev/null 2>&1; then
  lsof -ti tcp:4173 | xargs kill 2>/dev/null || true
  sleep 1
fi

echo "==> start preview"
( npm run pages-preview -- --strictPort >/tmp/cam-preview.log 2>&1 & echo $! > /tmp/cam-preview.pid )
PID="$(cat /tmp/cam-preview.pid)"
trap 'kill "$PID" 2>/dev/null || true; lsof -ti tcp:4173 2>/dev/null | xargs kill 2>/dev/null || true' EXIT

echo "==> wait for preview to be ready"
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:4173/castle-archive-memory-vault/" >/dev/null; then
    break
  fi
  sleep 0.5
done

echo "==> run Playwright"
SMOKE_BASE_URL="http://127.0.0.1:4173/castle-archive-memory-vault/" npx playwright test

echo "==> smoke OK"
