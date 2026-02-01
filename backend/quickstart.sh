#!/bin/bash

# Quick-start script for placeOps backend development
# This script sets up the environment and starts all required services

set -e

echo "🚀 placeOps Backend Quick Start"
echo "================================\n"

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please update it with your actual values.\n"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo "✅ Dependencies installed\n"
fi

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running\n"
else
  echo "❌ Redis is not running!"
  echo "Please start Redis with: redis-server (macOS/Linux) or run Redis Service (Windows)\n"
  exit 1
fi

# Run integration tests
echo "🧪 Running integration tests..."
node test-integration.js

# If tests pass, prompt to start services
echo "\n📋 Services to start:"
echo "  1. Main server:   npm start (or npm run dev)"
echo "  2. Worker:        npm run start:worker"
echo "  3. Scheduler:     npm run start:scheduler (optional)\n"

echo "💡 Tip: Use 'docker-compose up' to run everything (including Redis) in containers\n"
