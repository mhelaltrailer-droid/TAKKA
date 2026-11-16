#!/usr/bin/env python3
"""Fail if a dart_defines.json file is missing required release values."""

import json
import sys


PLACEHOLDER_SNIPPETS = (
    "replace_me",
    "changeme",
    "placeholder",
    "your_clerk",
    "your_key",
    "pk_test_replace",
)


def _bad(value: str) -> bool:
    if not value or not value.strip():
        return True
    lowered = value.strip().lower()
    if lowered in {"todo", "xxx", "none", "null"}:
        return True
    return any(snippet in lowered for snippet in PLACEHOLDER_SNIPPETS)


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: check_dart_defines.py <dart_defines.json>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        print("dart_defines.json must be a JSON object.", file=sys.stderr)
        sys.exit(1)

    errors: list[str] = []
    clerk = str(data.get("CLERK_PUBLISHABLE_KEY") or "")
    if _bad(clerk) or not (clerk.startswith("pk_test_") or clerk.startswith("pk_live_")):
        errors.append(
            "CLERK_PUBLISHABLE_KEY is missing, a placeholder, or not a Clerk publishable key (pk_test_ / pk_live_)."
        )
    pusher = str(data.get("PUSHER_KEY") or "")
    if _bad(pusher):
        errors.append("PUSHER_KEY is missing or a placeholder.")
    api = str(data.get("TAKKA_API_BASE_URL") or "")
    if _bad(api) or not (api.startswith("https://") or api.startswith("http://")):
        errors.append("TAKKA_API_BASE_URL must be an http(s) URL and not a placeholder.")

    if errors:
        print("Refusing to build a release APK:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        sys.exit(1)

    print(f"dart-defines ok (Clerk key length {len(clerk.strip())}, API set, Pusher key length {len(pusher.strip())}).")


if __name__ == "__main__":
    main()
