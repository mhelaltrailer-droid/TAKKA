#!/usr/bin/env bash
# Resolve the version baked into release APKs.
# pubspec.yaml is the source of truth (x.y.z+build).
# On a v* tag, the tag's version name (and build, if present) must match.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MOBILE_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$MOBILE_ROOT"

VERSION_LINE=$(grep -E '^version:' pubspec.yaml | head -n 1 | awk '{print $2}')
if [[ ! "$VERSION_LINE" =~ ^([0-9]+\.[0-9]+\.[0-9]+)\+([0-9]+)$ ]]; then
  echo "pubspec.yaml version must look like 1.2.3+4 (found: ${VERSION_LINE:-empty})." >&2
  exit 1
fi
VERSION_NAME="${BASH_REMATCH[1]}"
VERSION_CODE="${BASH_REMATCH[2]}"
RELEASE_TAG="v${VERSION_NAME}"

if [[ "${GITHUB_REF:-}" == refs/tags/* ]]; then
  TAG="${GITHUB_REF_NAME:-}"
  TAG_VERSION="${TAG#v}"
  TAG_NAME="$TAG_VERSION"
  TAG_CODE=""
  if [[ "$TAG_VERSION" == *"+"* ]]; then
    TAG_NAME="${TAG_VERSION%%+*}"
    TAG_CODE="${TAG_VERSION#*+}"
  fi
  if [[ ! "$TAG_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Tag $TAG must look like v1.2.3 or v1.2.3+4." >&2
    exit 1
  fi
  if [[ "$TAG_NAME" != "$VERSION_NAME" ]]; then
    echo "Tag $TAG does not match pubspec version name $VERSION_NAME." >&2
    echo "Bump takka_mobile/pubspec.yaml, commit it, then tag v$VERSION_NAME." >&2
    exit 1
  fi
  if [[ -n "$TAG_CODE" && "$TAG_CODE" != "$VERSION_CODE" ]]; then
    echo "Tag build $TAG_CODE does not match pubspec build $VERSION_CODE." >&2
    exit 1
  fi
  RELEASE_TAG="$TAG"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "version_name=$VERSION_NAME"
    echo "version_code=$VERSION_CODE"
    echo "release_tag=$RELEASE_TAG"
  } >> "$GITHUB_OUTPUT"
fi

echo "Version ${VERSION_NAME}+${VERSION_CODE} (release ${RELEASE_TAG})"
