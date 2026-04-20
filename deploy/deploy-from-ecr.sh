#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AWS_REGION:-}" || -z "${ECR_REGISTRY:-}" || -z "${ECR_BACKEND_REPO:-}" ]]; then
  echo "Missing required env vars: AWS_REGION, ECR_REGISTRY, ECR_BACKEND_REPO"
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-latest}"

if command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
elif docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
else
  echo "Neither docker-compose nor docker compose is available on this host."
  exit 1
fi

echo "Logging into ECR ${ECR_REGISTRY}..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "Deploying image tag ${IMAGE_TAG}..."
ECR_REGISTRY="${ECR_REGISTRY}" ECR_BACKEND_REPO="${ECR_BACKEND_REPO}" IMAGE_TAG="${IMAGE_TAG}" \
  "${compose_cmd[@]}" -f docker-compose.ecr.yml pull backend worker scheduler

ECR_REGISTRY="${ECR_REGISTRY}" ECR_BACKEND_REPO="${ECR_BACKEND_REPO}" IMAGE_TAG="${IMAGE_TAG}" \
  "${compose_cmd[@]}" -f docker-compose.ecr.yml up -d --force-recreate postgres redis backend worker scheduler

"${compose_cmd[@]}" -f docker-compose.ecr.yml ps

echo "Deployment completed successfully."
