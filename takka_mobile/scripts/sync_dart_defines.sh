#!/usr/bin/env bash
# Write takka_mobile/dart_defines.json from admin/.env. Never commit the output.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MOBILE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ADMIN_ENV="$MOBILE_ROOT/../admin/.env"
OUT_FILE="$MOBILE_ROOT/dart_defines.json"

if [[ ! -f "$ADMIN_ENV" ]]; then
  echo "Missing admin/.env at $ADMIN_ENV" >&2
  exit 1
fi

eval "$(
  python3 - "$ADMIN_ENV" <<'PY'
import shlex, sys
path = sys.argv[1]
wanted = {
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_PUSHER_KEY": "PUSHER_KEY",
    "NEXT_PUBLIC_PUSHER_CLUSTER": "PUSHER_CLUSTER",
}
found = {}
with open(path, encoding="utf-8") as handle:
    for raw in handle:
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key not in wanted:
            continue
        value = value.strip().strip('"').strip("'")
        found[wanted[key]] = value
missing = [src for src, dest in wanted.items() if dest != "PUSHER_CLUSTER" and not found.get(dest)]
if missing:
    sys.stderr.write("Missing in admin/.env: " + ", ".join(missing) + "\n")
    sys.exit(1)
for key in ("CLERK_PUBLISHABLE_KEY", "PUSHER_KEY", "PUSHER_CLUSTER"):
    if key in found:
        print(f"export {key}={shlex.quote(found[key])}")
PY
)"

export TAKKA_API_BASE_URL="${TAKKA_API_BASE_URL:-https://takka-app.onrender.com}"
export PUSHER_CLUSTER="${PUSHER_CLUSTER:-eu}"
python3 "$SCRIPT_DIR/write_dart_defines.py" "$OUT_FILE"
echo "Wrote $OUT_FILE"
echo "API: $TAKKA_API_BASE_URL"
