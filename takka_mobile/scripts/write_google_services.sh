#!/usr/bin/env bash
# Optional. Writes android/app/google-services.json from GOOGLE_SERVICES_JSON
# (base64 of the Firebase file). If the secret is unset, the release build
# continues and FCM stays disabled. See docs/fcm-setup.md.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MOBILE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUT="$MOBILE_ROOT/android/app/google-services.json"

if [[ -z "${GOOGLE_SERVICES_JSON:-}" ]]; then
  echo "::warning title=FCM disabled::GOOGLE_SERVICES_JSON is not set. The APK will build without Firebase. Push stays off until you add that secret."
  echo "WARNING: google-services.json is absent. Release APK will build with FCM disabled."
  exit 0
fi

umask 077
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
if ! printf '%s' "$GOOGLE_SERVICES_JSON" | tr -d '[:space:]' | base64 -d > "$tmp"; then
  echo "::error::GOOGLE_SERVICES_JSON is not valid base64."
  exit 1
fi

python3 - "$tmp" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as handle:
    data = json.load(handle)
clients = data.get("client") if isinstance(data, dict) else None
packages = []
if isinstance(clients, list):
    for client in clients:
        info = client.get("client_info") if isinstance(client, dict) else None
        android = info.get("android_client_info") if isinstance(info, dict) else None
        name = android.get("package_name") if isinstance(android, dict) else None
        if isinstance(name, str) and name.strip():
            packages.append(name.strip())
if "com.takka.app" not in packages:
    found = ", ".join(packages) if packages else "none"
    print(
        "::error::google-services.json must register Android package com.takka.app "
        f"(found: {found}). Re-download it from Firebase after adding that package name.",
        file=sys.stderr,
    )
    sys.exit(1)
print(f"google-services.json ok (package com.takka.app, {len(packages)} client(s)).")
PY

mkdir -p "$(dirname "$OUT")"
mv "$tmp" "$OUT"
trap - EXIT
echo "Wrote android/app/google-services.json for this build. It is gitignored."
