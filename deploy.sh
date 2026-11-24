#!/bin/bash

# Exit on error
set -e

APP_DIR="/var/www/sprogeny.com/app"

# Pull latest changes
echo "Pulling latest changes..."
git -C "$APP_DIR" checkout main && git -C "$APP_DIR" pull origin main

# Clean and reinstall dependencies
echo "Reinstalling dependencies..."
rm -rf "$APP_DIR/node_modules"
cd "$APP_DIR" && npm ci

# Build the Svelte project
echo "Building app..."
cd "$APP_DIR" && npm run build

# Run database migrations
echo "Running database migrations..."
cd "$APP_DIR" && set -a && source /etc/sprogeny/env && set +a && npx drizzle-kit push

# Reload pm2 instance
echo "Reloading pm2 process..."
pm2 reload sprogeny

echo "Deployment complete."
