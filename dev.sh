#!/bin/bash
# Auto-restarting dev server for Signal
# Usage: bash dev.sh
# Stop: Ctrl+C

source "$HOME/.nvm/nvm.sh" 2>/dev/null

cd "$(dirname "$0")"

# Limit Node.js memory to prevent OOM kills
export NODE_OPTIONS="--max-old-space-size=256"

echo "Starting Signal dev server (auto-restart enabled)..."
echo "Press Ctrl+C to stop."
echo ""

while true; do
  npx next dev --turbopack
  EXIT_CODE=$?
  echo ""
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 2s..."
  echo ""
  sleep 2
done
