#!/bin/sh
set -e

# Run Prisma schema push to ensure the SQLite DB is created/updated in the persistent volume
echo "Syncing database schema..."
npx prisma db push --accept-data-loss

echo "Starting server..."
npm start
