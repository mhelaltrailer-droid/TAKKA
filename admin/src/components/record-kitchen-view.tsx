"use client";

import { useEffect } from "react";

const STORAGE_KEY = "takka_browse_session_key";

function getOrCreateSessionKey() {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 8) {
      return existing;
    }
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return `sess_${Date.now()}`;
  }
}

/** Fire-and-forget kitchen page view for guest or signed-in browsers. */
export function RecordKitchenView({ kitchenId }: { kitchenId: string }) {
  useEffect(() => {
    if (!kitchenId) return;
    const sessionKey = getOrCreateSessionKey();
    void fetch(`/api/discovery/kitchens/${encodeURIComponent(kitchenId)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey }),
      keepalive: true,
    }).catch(() => {
      // Stats tracking must never block browsing.
    });
  }, [kitchenId]);

  return null;
}
