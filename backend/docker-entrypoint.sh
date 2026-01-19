#!/bin/sh
set -e

# Optional DB bootstrap on container start.
# This is idempotent and helps first-time deployments.
# Disable by setting RUN_DB_PUSH_ON_START=false.

if [ "${RUN_DB_PUSH_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Ensuring database schema is applied (prisma db push)..."
  npx prisma db push --schema prisma/schema.postgres.prisma
else
  echo "[entrypoint] RUN_DB_PUSH_ON_START=false; skipping prisma db push"
fi

echo "[entrypoint] Starting server..."
exec node dist/server.js
