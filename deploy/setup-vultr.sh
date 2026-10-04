#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu 22.04/24.04 Vultr Cloud Compute server. Run as root from the repository root:
#   sudo bash deploy/setup-vultr.sh [your.domain.com]
# It installs Docker, checks the two secret files exist, opens the firewall and starts the game.
set -euo pipefail

cd "$(dirname "$0")/.."
DOMAIN_ARG="${1:-}"
ALT_ARG="${2:-}"   # optional second name, e.g. 45-76-235-124.sslip.io

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root (sudo bash deploy/setup-vultr.sh)." >&2
  exit 1
fi

# The two things that are never in git. Copy them up first (see docs/deploy-vultr.md).
missing=0
[ -f .env ] || { echo "Missing .env  (copy .env.example to .env and add GEMINI_API_KEY / ELEVEN_LABS_API_KEY)" >&2; missing=1; }
[ -f server/private/case-private.json ] || { echo "Missing server/private/case-private.json  (the case answers and solution; ask the team)" >&2; missing=1; }
[ "$missing" -eq 0 ] || exit 1

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  apt-get update -y
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-plugin

# Small servers run out of memory building the website; add swap once if there is none.
if [ "$(swapon --show | wc -l)" -eq 0 ] && [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 2000 ]; then
  echo "Adding 2 GB swap for the build..."
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
fi

# Remember the domain in deploy/.env (gitignored). Compose reads it on every later `up`, so a plain
# `docker compose up -d --build` during an update can never silently drop HTTPS back to plain http.
SAVED_DOMAIN="$(grep -s '^DOMAIN=' deploy/.env | head -1 | cut -d= -f2-)"
SAVED_ALT="$(grep -s '^ALT_DOMAIN=' deploy/.env | head -1 | cut -d= -f2-)"
DOMAIN_ARG="${DOMAIN_ARG:-$SAVED_DOMAIN}"
ALT_ARG="${ALT_ARG:-$SAVED_ALT}"
if [ -n "$DOMAIN_ARG" ]; then
  echo "DOMAIN=$DOMAIN_ARG" > deploy/.env
  if [ -n "$ALT_ARG" ]; then echo "ALT_DOMAIN=$ALT_ARG" >> deploy/.env; fi
fi
export DOMAIN="${DOMAIN_ARG:-:80}"
export ALT_DOMAIN="${ALT_ARG:-alt.localhost}"
echo "Serving on: ${DOMAIN_ARG:-plain http (no domain)}${ALT_ARG:+ and ${ALT_ARG}}"
docker compose -f deploy/docker-compose.yml up -d --build

echo
echo "Waiting for the game to answer..."
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then
    echo "Unsolved.exe is up: ${DOMAIN_ARG:+https://$DOMAIN_ARG}${DOMAIN_ARG:-http://$(curl -fsS https://ifconfig.me 2>/dev/null || echo this-server-ip)}"
    echo "Config check: curl -s http://127.0.0.1/api/config"
    exit 0
  fi
  sleep 2
done
echo "It did not come up in time. Check: docker compose -f deploy/docker-compose.yml logs --tail=100" >&2
exit 1
