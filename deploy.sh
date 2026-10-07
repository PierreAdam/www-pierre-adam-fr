#!/usr/bin/env bash
# Build the website image, push it to registry.jackson42.com and redeploy the stack.
# Requires: Docker running locally, `docker login registry.jackson42.com` done once,
# and SSH access to the server with your key.
set -euo pipefail

IMAGE="registry.jackson42.com/dontpanic57/pierre-adam-website"
TAG="$(date +%Y%m%d-%H%M%S)"
SSH_TARGET="adam_p@www.jackson42.com"
SSH_PORT=4242
STACK_DIR="/srv/docker/config/pierre-adam-website"

cd "$(dirname "$0")"

echo ">> Building $IMAGE:$TAG"
docker build --platform linux/amd64 -t "$IMAGE:$TAG" -t "$IMAGE:latest" .

echo ">> Pushing"
docker push "$IMAGE:$TAG"
docker push "$IMAGE:latest"

echo ">> Deploying on $SSH_TARGET"
ssh -p "$SSH_PORT" "$SSH_TARGET" "cd '$STACK_DIR' && docker compose pull && docker compose up -d && docker image prune -f >/dev/null"

echo ">> Checking"
sleep 3
ssh -p "$SSH_PORT" "$SSH_TARGET" "curl -fsS -o /dev/null -w 'container answered HTTP %{http_code}\n' http://127.0.0.1:10100/"

echo ">> Done: $IMAGE:$TAG"
