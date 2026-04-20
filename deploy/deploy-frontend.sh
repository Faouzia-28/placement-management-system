#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d "frontend-deploy/dist" ]]; then
  echo "Missing frontend-deploy/dist on server. Sync built frontend files first."
  exit 1
fi

echo "Deploying frontend container with docker-compose.frontend.yml..."
docker compose -f docker-compose.frontend.yml up -d --force-recreate frontend

docker compose -f docker-compose.frontend.yml ps

echo "Frontend deployment completed successfully."
