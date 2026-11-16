#!/usr/bin/env python3
"""Write dart_defines.json from the process environment. Does not print secret values."""

import json
import os
import sys


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: write_dart_defines.py <output.json>", file=sys.stderr)
        sys.exit(2)
    api = os.environ.get("TAKKA_API_BASE_URL", "").strip() or "https://takka-app.onrender.com"
    cluster = os.environ.get("PUSHER_CLUSTER", "").strip() or "eu"
    payload = {
        "CLERK_PUBLISHABLE_KEY": os.environ.get("CLERK_PUBLISHABLE_KEY", "").strip(),
        "TAKKA_API_BASE_URL": api,
        "PUSHER_KEY": os.environ.get("PUSHER_KEY", "").strip(),
        "PUSHER_CLUSTER": cluster,
    }
    with open(sys.argv[1], "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()
