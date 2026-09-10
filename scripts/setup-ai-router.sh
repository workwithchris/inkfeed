#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AI_ROUTER_DIR="$(dirname "$ROOT_DIR")/ai-router"

if [ ! -d "$AI_ROUTER_DIR/packages/core/dist" ]; then
  echo "Building ai-router core..."
  cd "$AI_ROUTER_DIR" && npm install && npm run build
fi

echo "Copying @ai-router/core..."
rm -rf "$ROOT_DIR/node_modules/@ai-router"
mkdir -p "$ROOT_DIR/node_modules/@ai-router"
cp -r "$AI_ROUTER_DIR/packages/core" "$ROOT_DIR/node_modules/@ai-router/core"

echo "Done."
