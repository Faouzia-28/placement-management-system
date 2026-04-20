#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d "frontend-deploy/dist" ]]; then
  echo "Missing frontend-deploy/dist on server. Sync built frontend files first."
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
elif docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
else
  echo "Neither docker-compose nor docker compose is available on this host."
  exit 1
fi

echo "Deploying frontend container with docker-compose.frontend.yml..."
"${compose_cmd[@]}" -f docker-compose.frontend.yml up -d --force-recreate frontend

"${compose_cmd[@]}" -f docker-compose.frontend.yml ps

echo "Frontend deployment completed successfully."
