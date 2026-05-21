#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-ai-rpg}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
BRANCH="${BRANCH:-main}"
ENTRYPOINT="${ENTRYPOINT:-server.js}"
ECOSYSTEM_FILE="${ECOSYSTEM_FILE:-ecosystem.config.cjs}"

cd "$APP_DIR"

echo "Deploying $APP_NAME from $APP_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but was not found."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required but was not found. Install it with: npm install -g pm2"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes. Commit or stash them before deploying."
  git status --short
  exit 1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f ".env" ]; then
  echo ".env is missing. Create it before deploying."
  exit 1
fi

has_env_value() {
  local key="$1"
  grep -Eq "^[[:space:]]*${key}[[:space:]]*=[[:space:]]*.+$" .env
}

get_env_value() {
  local key="$1"
  grep -E "^[[:space:]]*${key}[[:space:]]*=" .env | tail -n 1 | sed -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//; s/[[:space:]]+$//; s/^['\"]//; s/['\"]$//"
}

assert_local_mongo_uri() {
  local mongo_uri="$1"

  if [[ "$mongo_uri" == mongodb+srv://* ]]; then
    echo "MONGODB_URI must use local mongodb://, not mongodb+srv://."
    exit 1
  fi

  if [[ ! "$mongo_uri" =~ ^mongodb://([^/?#]+) ]]; then
    echo "MONGODB_URI must be a valid mongodb:// URI."
    exit 1
  fi

  local hosts="${BASH_REMATCH[1]}"
  local IFS=","
  local host

  for host in $hosts; do
    host="${host##*@}"

    if [[ "$host" == \[* ]]; then
      host="${host#\[}"
      host="${host%%\]*}"
    else
      host="${host%%:*}"
    fi

    case "$host" in
      127.0.0.1|localhost|::1) ;;
      *)
        echo "MONGODB_URI is restricted to localhost. Refused host: $host"
        exit 1
        ;;
    esac
  done
}

missing_env=()

if [ "${#missing_env[@]}" -gt 0 ]; then
  echo "Missing required environment variables: ${missing_env[*]}"
  exit 1
fi

if has_env_value "MONGODB_URI"; then
  assert_local_mongo_uri "$(get_env_value "MONGODB_URI")"
fi

npm ci --omit=dev

if [ -f "$ECOSYSTEM_FILE" ]; then
  pm2 startOrReload "$ECOSYSTEM_FILE" --only "$APP_NAME" --update-env
elif pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start "$ENTRYPOINT" --name "$APP_NAME" --update-env
fi

pm2 save
pm2 status "$APP_NAME"

echo "Deployment completed."
