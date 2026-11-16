#!/usr/bin/env bash
# Fail when release-signing secrets are only partly set.
# When none are set, warn and allow the debug-key fallback in Gradle.
set -euo pipefail

count=0
for name in KEYSTORE_BASE64 KEYSTORE_PASSWORD KEY_ALIAS KEY_PASSWORD; do
  value="${!name-}"
  if [[ -n "$value" ]]; then
    count=$((count + 1))
  fi
done

if [[ "$count" -eq 0 ]]; then
  echo "::warning title=Debug signing::Release keystore secrets are not set. APKs will be signed with the Android debug key. Create a release keystore before the first real distribution; a later upload key cannot update an app that was installed with the debug key."
  echo "WARNING: Release keystore is not configured. Gradle will sign this release with the debug key."
  exit 0
fi

if [[ "$count" -ne 4 ]]; then
  echo "::error::Signing secrets are incomplete (${count}/4). Set all of KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, and KEY_PASSWORD, or leave all of them empty."
  exit 1
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
if ! printf '%s' "$KEYSTORE_BASE64" | tr -d '[:space:]' | base64 -d > "$tmp"; then
  echo "::error::KEYSTORE_BASE64 is not valid base64."
  exit 1
fi
size=$(wc -c < "$tmp" | tr -d ' ')
if [[ "$size" -lt 64 ]]; then
  echo "::error::Decoded keystore is unexpectedly small (${size} bytes)."
  exit 1
fi
echo "Release keystore secret decoded (${size} bytes). Alias is set. Gradle will sign with it."
