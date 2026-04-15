#!/bin/sh
set -e

# Run Prisma migrations if DATABASE_URL is set
# Uses npx with @6 to stay compatible with the project's Prisma v6 schema
if [ -n "$DATABASE_URL" ] && [ -f "./prisma/schema.prisma" ]; then
  echo "Running database migrations..."
  npx --yes prisma@6 migrate deploy --schema=./prisma/schema.prisma || echo "Migration skipped or failed — check DATABASE_URL"
fi

exec "$@"
