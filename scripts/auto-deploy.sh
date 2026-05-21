#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${BRANCH:-main}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-60}"

cd "$APP_DIR"

echo "Watching origin/$BRANCH for updates every ${INTERVAL_SECONDS}s."

while true; do
  if git fetch origin "$BRANCH"; then
    local_head="$(git rev-parse HEAD)"
    remote_head="$(git rev-parse "origin/$BRANCH")"

    if [ "$local_head" != "$remote_head" ]; then
      if ! git merge-base --is-ancestor "$local_head" "$remote_head"; then
        echo "origin/$BRANCH is not a fast-forward update from local HEAD; skipping deploy."
        sleep "$INTERVAL_SECONDS"
        continue
      fi

      echo "Detected origin/$BRANCH update: $local_head -> $remote_head"

      if ./deploy.sh; then
        echo "Deploy completed for $remote_head"
      else
        echo "Deploy failed for $remote_head"
      fi
    fi
  else
    echo "git fetch failed; will retry."
  fi

  sleep "$INTERVAL_SECONDS"
done
