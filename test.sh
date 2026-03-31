#!/bin/bash
# Run tests in mock mode — zero Lusha credits consumed.
# Usage: bash test.sh  OR  pnpm test
#
# How it works:
# 1. Stops any running dev server on port 3000
# 2. Starts a fresh dev server WITHOUT LUSHA_API_KEY (→ mock data)
# 3. Runs vitest against the mock server
# 4. Stops the mock server
# 5. Restarts your normal dev server (with real key) automatically
#
# To use real Lusha API in the browser: just run `pnpm dev` as usual.

set -e

PORT=3000
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Stop any running dev server ───────────────────────────────────────────
echo "🧹 Stopping existing dev server..."
pkill -f "next dev" 2>/dev/null || true
# Wait until port is actually free
WAIT=0
while lsof -ti :$PORT >/dev/null 2>&1 && [ $WAIT -lt 10 ]; do
  sleep 1
  WAIT=$((WAIT + 1))
done
# Force kill anything left
lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
sleep 1

# ── 2. Start dev server WITHOUT Lusha key (mock mode) ────────────────────────
echo "🚀 Starting test server in mock mode (no Lusha credits)..."
LUSHA_API_KEY= npx next dev --turbopack --port $PORT > /tmp/signal-test-server.log 2>&1 &
TEST_SERVER_PID=$!

# Cleanup: always kill mock server and restart real one
cleanup() {
  echo ""
  echo "🧹 Stopping test server..."
  kill $TEST_SERVER_PID 2>/dev/null || true
  wait $TEST_SERVER_PID 2>/dev/null || true
  sleep 1
  echo "🔄 Restarting dev server with real API keys..."
  cd "$SCRIPT_DIR"
  nohup npx next dev --turbopack --port $PORT > /dev/null 2>&1 &
  echo "✅ Dev server restarted on port $PORT (real mode)"
}
trap cleanup EXIT

# ── 3. Wait for server to be ready ───────────────────────────────────────────
echo "⏳ Waiting for test server..."
RETRIES=0
MAX_RETRIES=30
until curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT" 2>/dev/null | grep -qE '200|307|308'; do
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo "❌ Test server failed to start after ${MAX_RETRIES}s. Log:"
    tail -20 /tmp/signal-test-server.log
    exit 1
  fi
  sleep 1
done
echo "✅ Test server ready (mock mode — 0 credits)"

# ── 4. Run tests ─────────────────────────────────────────────────────────────
echo ""
echo "🧪 Running tests..."
echo ""
npx vitest run "$@"
TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ All tests passed (0 Lusha credits consumed)"
else
  echo "❌ Some tests failed (exit code: $TEST_EXIT)"
fi

exit $TEST_EXIT
