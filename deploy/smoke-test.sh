#!/usr/bin/env bash
# Checks a running Unsolved.exe API from the outside. Needs only curl and python3; no secrets.
#   bash deploy/smoke-test.sh https://45-76-235-124.sslip.io
set -u
BASE="${1:?usage: smoke-test.sh <base-url, e.g. https://45-76-235-124.sslip.io>}"
BASE="${BASE%/}"
JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then printf "  ok    %s\n" "$1"; else printf "  FAIL  %s (expected %s, got %s)\n" "$1" "$2" "$3"; fail=1; fi
}
code() { curl -s -m 25 -b "$JAR" -c "$JAR" -o /dev/null -w "%{http_code}" "$@"; }

echo "Smoke test: $BASE"
check "health"                         200 "$(code "$BASE/api/health")"
check "config"                         200 "$(code "$BASE/api/config")"
check "public image 01"                200 "$(code "$BASE/api/files/01/image")"
check "public image 02"                200 "$(code "$BASE/api/files/02/image")"
for id in 04 05 06; do check "locked image $id is locked" 403 "$(code "$BASE/api/files/$id/image")"; done
check "preview bypass is off"          403 "$(code "$BASE/api/files/05/image?preview=true")"
check "unknown image"                  404 "$(code "$BASE/api/files/99/image")"
for p in status files scenarios; do check "dev route /api/dev/$p absent" 404 "$(code "$BASE/api/dev/$p")"; done
check "fresh player has no progress"   '{"unlocked":{}}' "$(curl -s -m 15 -b "$JAR" "$BASE/api/progress")"
check "wrong unlock answer is refused" true "$(curl -s -m 15 -b "$JAR" -X POST "$BASE/api/unlock" -H 'Content-Type: application/json' -d '{"fileId":"05","answer":"definitely-wrong","attempt":1}' | python3 -c "import sys,json;print(str(json.load(sys.stdin).get('ok') is False).lower())")"
check "empty report is refused"        400 "$(code -X POST "$BASE/api/accuse" -H 'Content-Type: application/json' -d '{}')"
check "report is graded and explained" true "$(curl -s -m 45 -b "$JAR" -X POST "$BASE/api/accuse" -H 'Content-Type: application/json' -d '{"culprit":"nb","evidence":["01"],"theory":"Smoke test report."}' | python3 -c "import sys,json;d=json.load(sys.stdin);print(str(d.get('verdict') in ('incorrect','partial','solved') and len(d.get('explanation',[]))>0).lower())")"
case "$BASE" in https://*) check "cookie is Secure over https" true "$(curl -s -m 15 -D - -o /dev/null "$BASE/api/health" | grep -i '^set-cookie' | grep -q 'Secure' && echo true || echo false)";; esac
echo
echo "Feature flags: $(curl -s -m 15 "$BASE/api/config")"
[ $fail -eq 0 ] && echo "All checks passed." || { echo "Some checks FAILED."; exit 1; }
