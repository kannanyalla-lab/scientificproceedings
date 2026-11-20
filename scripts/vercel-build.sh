#!/usr/bin/env bash
# Build used on Vercel: set up the database and sample content, then build.
set -euo pipefail
if [ -n "${DATABASE_URL:-}" ]; then
  npx tsx scripts/setup.ts
else
  echo "DATABASE_URL is not set: connect a Postgres database (e.g. Neon) and redeploy."
fi
next build
