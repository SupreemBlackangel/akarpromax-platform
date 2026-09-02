#!/usr/bin/env bash
#
# Publish the office app's update manifest -- and refuse to do it unsafely.
#
# version.json carries "mandatory": true. Every installed client checks it, and
# when the advertised version is newer than its own it demands an update and
# will not continue without one. So publishing a version whose installer is not
# actually downloadable does not degrade the service: it locks every customer
# out of their own business software, with no way back except a manual
# reinstall on each machine.
#
# That failure is one careless command away and has no undo, so this script
# exists to make the safe order the only order. It verifies the installer is
# live, downloadable and the size it claims BEFORE the manifest is touched.
#
# Usage:
#   scripts/publish-office-manifest.sh 2.0.7 "release notes in Arabic"
#
set -euo pipefail

VERSION="${1:-}"
NOTES="${2:-}"
HOST="root@213.199.38.15"
KEY="$HOME/.ssh/akarpromax_deploy"
SETUP_URL="/downloads/AkarProMaxOffice-Setup.exe"
BASE="https://akarpromax.com"
REMOTE_MANIFEST="/var/www/akarpromax-v2/public/office-app/version.json"

fail() { printf '\nREFUSED: %s\n' "$1" >&2; exit 1; }

[ -n "$VERSION" ] || fail "no version given. Usage: $0 <version> [notes]"
printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' \
  || fail "version '$VERSION' is not MAJOR.MINOR.PATCH"

echo "== 1. the installer must already be published =="
code=$(curl -s -o /dev/null -m 60 -w '%{http_code}' -I "$BASE$SETUP_URL")
[ "$code" = "200" ] || fail "$SETUP_URL returned HTTP $code. Upload the installer FIRST."

size=$(curl -sI -m 60 "$BASE$SETUP_URL" | tr -d '\r' | awk '/^[Cc]ontent-[Ll]ength:/ {print $2}')
[ -n "$size" ] || fail "$SETUP_URL reports no Content-Length; cannot confirm it is a real file."
# A truncated or placeholder upload would still answer 200. An installer for
# this application is tens of megabytes.
[ "$size" -ge 5000000 ] || fail "$SETUP_URL is only $size bytes. That is not a complete installer."
echo "   installer present: $size bytes"

echo "== 2. it must actually download, not merely respond =="
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
curl -s -m 300 -o "$tmp" "$BASE$SETUP_URL" || fail "the installer could not be downloaded end to end."
got=$(wc -c < "$tmp")
[ "$got" = "$size" ] || fail "downloaded $got bytes but the server advertised $size."
# MZ: every Windows executable starts with it. Catches an HTML error page saved
# with a 200, which is exactly what a misconfigured path returns.
head -c 2 "$tmp" | grep -q 'MZ' || fail "the downloaded file is not a Windows executable."
echo "   downloaded and verified: $got bytes, MZ header present"
sha=$(sha256sum "$tmp" | cut -d' ' -f1)
echo "   sha256: $sha"

echo "== 3. current manifest =="
current=$(curl -s -m 60 "$BASE/office-app/version.json" || true)
echo "$current" | sed 's/^/   /'
currentVersion=$(printf '%s' "$current" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ "$currentVersion" != "$VERSION" ] || fail "the manifest already advertises $VERSION. Nothing to do."

echo "== 4. confirm =="
echo "   About to advertise $VERSION as a MANDATORY update to every installation."
echo "   Every client will demand it on next launch."
printf '   Type the version to confirm: '
read -r typed
[ "$typed" = "$VERSION" ] || fail "confirmation did not match."

echo "== 5. publishing =="
printf '{\n  "version": "%s",\n  "setupUrl": "%s",\n  "mandatory": true,\n  "sha256": "%s",\n  "releaseDate": "%s",\n  "notes": "%s"\n}\n' \
  "$VERSION" "$SETUP_URL" "$sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$NOTES" > "$tmp.json"

ssh -o ConnectTimeout=25 -i "$KEY" "$HOST" "cp $REMOTE_MANIFEST $REMOTE_MANIFEST.bak-\$(date +%Y%m%d-%H%M%S)"
scp -o ConnectTimeout=25 -i "$KEY" "$tmp.json" "$HOST:$REMOTE_MANIFEST"
rm -f "$tmp.json"

echo "== 6. verifying what customers will now see =="
sleep 2
curl -s -m 60 "$BASE/office-app/version.json" | sed 's/^/   /'
echo
echo "Published $VERSION. The previous manifest is backed up beside it on the server."
