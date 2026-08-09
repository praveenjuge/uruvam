#!/bin/sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

if [ ! -f package.json ] || [ ! -f pnpm-lock.yaml ]; then
  echo "BLOCKED: package.json and pnpm-lock.yaml are required before app quality gates can run." >&2
  exit 2
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "BLOCKED: pnpm is not available." >&2
  exit 2
fi

pnpm install --frozen-lockfile

for gate in format:check lint typecheck test build; do
  if pnpm run | grep -q "^  $gate"; then
    pnpm run "$gate"
  else
    echo "BLOCKED: missing required package script '$gate'." >&2
    exit 2
  fi
done

if pnpm run | grep -q '^  test:security'; then
  pnpm run test:security
fi

if pnpm run | grep -q '^  test:e2e'; then
  pnpm run test:e2e
fi

if pnpm run | grep -q '^  package'; then
  pnpm run package -- --arch=arm64
fi
