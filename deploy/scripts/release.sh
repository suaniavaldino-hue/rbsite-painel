#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/rbsite-social-automation/current}"
SERVICE_NAME="${SERVICE_NAME:-rbsite-social-automation}"

cd "$APP_DIR"

npm ci
npm run build
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager
