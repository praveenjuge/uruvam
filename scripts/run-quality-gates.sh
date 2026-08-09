#!/bin/sh
set -eu
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/architecture-check.mjs
node scripts/secret-scan.mjs
