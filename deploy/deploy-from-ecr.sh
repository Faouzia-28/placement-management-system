#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AWS_REGION:-}" || -z "${ECR_REGISTRY:-}" || -z "${ECR_BACKEND_REPO:-}" ]]; then
  echo "Missing required env vars: AWS_REGION, ECR_REGISTRY, ECR_BACKEND_REPO"
  exit 1
fi

IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "Logging into ECR ${ECR_REGISTRY}..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "Deploying image tag ${IMAGE_TAG}..."
ECR_REGISTRY="${ECR_REGISTRY}" ECR_BACKEND_REPO="${ECR_BACKEND_REPO}" IMAGE_TAG="${IMAGE_TAG}" \
  docker compose -f docker-compose.ecr.yml pull backend worker scheduler

ECR_REGISTRY="${ECR_REGISTRY}" ECR_BACKEND_REPO="${ECR_BACKEND_REPO}" IMAGE_TAG="${IMAGE_TAG}" \
  docker compose -f docker-compose.ecr.yml up -d redis backend worker scheduler

docker compose -f docker-compose.ecr.yml ps

echo "Deployment completed successfully."
