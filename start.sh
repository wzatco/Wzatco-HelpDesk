#!/bin/bash
# Hostinger Cloud Start Script
# Forces custom server execution with Socket.IO support

echo "🚀 Starting Custom Next.js Server with Socket.IO..."
echo "=================================================="

# Ensure environment is set
export NODE_ENV="${NODE_ENV:-production}"
echo "✅ Environment: $NODE_ENV"

# Check if .next directory exists
if [ ! -d ".next" ]; then
  echo "❌ ERROR: .next directory not found!"
  echo "Please run 'npm run build' before starting the server."
  exit 1
fi

# Start the custom server
echo "✅ Launching server.js..."
exec node server.js

