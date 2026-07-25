#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p logs

{
  echo "[$(date -u +%FT%TZ)] deploy start"

  git fetch --quiet origin master
  git reset --hard origin/master

  npm ci --omit=dev

  if command -v yt-dlp >/dev/null 2>&1; then
    yt-dlp -U || true
  fi

  pm2 reload ecosystem.config.cjs --only slicktok --update-env

  echo "[$(date -u +%FT%TZ)] deploy done"
} >> logs/deploy.log 2>&1
