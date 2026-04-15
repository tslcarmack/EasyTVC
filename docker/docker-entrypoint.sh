#!/bin/sh
set -e

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ] && [ -f "./prisma/schema.prisma" ]; then
  echo "Running database migrations..."
  npx --yes prisma migrate deploy --schema=./prisma/schema.prisma || echo "Migration skipped or failed — check DATABASE_URL"
fi

exec "$@"
