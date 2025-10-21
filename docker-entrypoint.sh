#!/bin/sh
set -e

echo "Initializing database..."
if ! node dist/utils/initDb.js; then
  echo "WARNING: Database initialization encountered errors, but continuing..."
fi

echo "Running database migrations..."
# The init script also runs ALTER TABLE statements for migrations
# These will be skipped if columns already exist

echo "Starting Musable server..."
exec node dist/app.js
