#!/bin/sh

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Skipping migrations."
  # The app will likely fail in env.js validation, but we handle the migration skip here.
  # We proceeds to let the app start (and fail with its own error if needed) or exit if critical.
  # User requested graceful exit or clear error. 
  # Since env.js also checks it, we can just print and let the app handle it, OR exit here.
  # "If DATABASE_URL is NOT defined: Log clear error... Then exit gracefully"
  echo "Exiting..."
  exit 1
fi

echo "DATABASE_URL is set. Running migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node src/app.js
