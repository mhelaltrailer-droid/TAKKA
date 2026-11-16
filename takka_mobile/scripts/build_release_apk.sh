#!/usr/bin/env bash
# Release APKs with Clerk / API dart-defines.
# Split-per-ABI (arm64-v8a, armeabi-v7a) plus an optional universal APK.
#
# Usage (from anywhere):
#   bash takka_mobile/scripts/build_release_apk.sh
#   bash takka_mobile/scripts/build_release_apk.sh --no-universal
#   bash takka_mobile/scripts/build_release_apk.sh --x86_64
#   bash takka_mobile/scripts/build_release_apk.sh --ci
#
# --ci expects dart_defines.json to already exist (GitHub Actions writes it
# from secrets). Locally, a missing file is synced from admin/.env.
set -euo pipefail

UNIVERSAL=1
X86=0
CI=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --universal) UNIVERSAL=1 ;;
    --no-universal) UNIVERSAL=0 ;;
    --x86_64) X86=1 ;;
    --no-x86_64) X86=0 ;;
    --ci) CI=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
  shift
done

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MOBILE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$MOBILE_ROOT"

DEFINES="$MOBILE_ROOT/dart_defines.json"
if [[ ! -f "$DEFINES" ]]; then
  if [[ "$CI" == "1" ]]; then
    echo "dart_defines.json is missing. CI must write it from GitHub secrets before building." >&2
    exit 1
  fi
  echo "dart_defines.json missing — syncing from admin/.env ..."
  bash "$SCRIPT_DIR/sync_dart_defines.sh"
fi

python3 "$SCRIPT_DIR/check_dart_defines.py" "$DEFINES"

VERSION_LINE=$(grep -E '^version:' pubspec.yaml | head -n 1 | awk '{print $2}')
if [[ ! "$VERSION_LINE" =~ ^([0-9]+\.[0-9]+\.[0-9]+)\+([0-9]+)$ ]]; then
  echo "pubspec.yaml version must look like 1.2.3+4 (found: ${VERSION_LINE:-empty})." >&2
  exit 1
fi
VERSION_NAME="${BASH_REMATCH[1]}"
VERSION_CODE="${BASH_REMATCH[2]}"
FILE_VERSION="${VERSION_NAME}-${VERSION_CODE}"

PLATFORMS="android-arm,android-arm64"
if [[ "$X86" == "1" ]]; then
  PLATFORMS="${PLATFORMS},android-x64"
fi

OUT_DIR="$MOBILE_ROOT/build/app/outputs/flutter-apk"
DIST_DIR="$OUT_DIR/dist"
mkdir -p "$DIST_DIR"

echo "Building split release APKs ($PLATFORMS) for $VERSION_NAME+$VERSION_CODE ..."
flutter build apk --release \
  --build-name "$VERSION_NAME" \
  --build-number "$VERSION_CODE" \
  --split-per-abi \
  --target-platform "$PLATFORMS" \
  --dart-define-from-file=dart_defines.json

copy_apk() {
  local src_name="$1"
  local dest_name="$2"
  local src="$OUT_DIR/$src_name"
  if [[ ! -f "$src" ]]; then
    echo "Expected APK was not produced: $src" >&2
    exit 1
  fi
  cp -f "$src" "$DIST_DIR/$dest_name"
  echo "$DIST_DIR/$dest_name"
}

RECOMMENDED=""
copy_apk "app-arm64-v8a-release.apk" "takka-${FILE_VERSION}-arm64-v8a.apk"
RECOMMENDED="$DIST_DIR/takka-${FILE_VERSION}-arm64-v8a.apk"
copy_apk "app-armeabi-v7a-release.apk" "takka-${FILE_VERSION}-armeabi-v7a.apk"
if [[ "$X86" == "1" ]]; then
  copy_apk "app-x86_64-release.apk" "takka-${FILE_VERSION}-x86_64.apk"
fi

if [[ "$UNIVERSAL" == "1" ]]; then
  echo "Building universal release APK ..."
  flutter build apk --release \
    --build-name "$VERSION_NAME" \
    --build-number "$VERSION_CODE" \
    --target-platform "$PLATFORMS" \
    --dart-define-from-file=dart_defines.json
  copy_apk "app-release.apk" "takka-${FILE_VERSION}-universal.apk"
  RECOMMENDED="$DIST_DIR/takka-${FILE_VERSION}-universal.apk"
fi

printf '%s' "$RECOMMENDED" > "$MOBILE_ROOT/LATEST_APK_PATH.txt"
echo ""
echo "APKs ready in:"
echo "$DIST_DIR"
echo "Recommended path written to LATEST_APK_PATH.txt:"
echo "$RECOMMENDED"
