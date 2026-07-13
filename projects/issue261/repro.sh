#!/usr/bin/env bash
# Demonstrates the regression side by side on tsc-alias 1.9.0 vs 1.8.17.
set -euo pipefail

echo "Installing dependencies..."
npm install --silent

run() {
  local version="$1"
  echo
  echo "=================================================================="
  echo " tsc-alias@${version}"
  echo "=================================================================="
  npm install --silent --no-save "tsc-alias@${version}"
  rm -rf dist
  npx tsc --noCheck
  npx tsc-alias
  echo "--- compiled dist/redis.js require() line ---"
  grep 'require(' dist/redis.js
  echo "--- runtime ---"
  if node -e "require('./dist/redis.js'); console.log('OK: package resolved correctly')" 2>&1; then
    :
  else
    echo "FAILED: module required itself instead of the npm package"
  fi
}

run "1.8.17"   # expected: require("redis")  -> works
run "1.9.0"    # regressed: require("./redis") -> TypeError at runtime
