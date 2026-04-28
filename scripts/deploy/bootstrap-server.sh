#!/usr/bin/env sh
set -eu

DEPLOY_PATH="${DEPLOY_PATH:-/srv/goblin-cartel}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker Engine before running deploy."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is not available."
  exit 1
fi

sudo mkdir -p "$DEPLOY_PATH"
sudo chown "$USER:$USER" "$DEPLOY_PATH"

echo "Server deploy path is ready: $DEPLOY_PATH"
