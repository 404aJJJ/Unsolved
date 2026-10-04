#!/usr/bin/env bash
# Starts the Python API for local development (macOS/Linux). From anywhere:  bash server/run-dev.sh
# Creates server/.venv and installs the requirements on first run. Windows: see server/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f server/private/case-private.json ]; then
  echo "Missing server/private/case-private.json (the answers and locked files; ask the team for it)." >&2
  exit 1
fi
if [ ! -x server/.venv/bin/python ]; then
  echo "Creating server/.venv ..."
  python3 -m venv server/.venv
fi
server/.venv/bin/python -m pip install -q -r server/requirements.txt

echo "Python API on http://127.0.0.1:8000  (health: /api/health). In another terminal: cd web && npm run dev:api"
# UNSOLVED_DEV=1 turns on the Test Lab routes; it must never be set on a public server.
UNSOLVED_DEV=1 exec server/.venv/bin/python -m uvicorn server.main:app --reload --reload-dir server --port 8000
