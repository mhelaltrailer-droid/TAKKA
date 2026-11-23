"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { clearDiscoveryFeedCache } from "@/lib/discovery-feed";
import { saveDiscoveryCacheSettings } from "@/lib/discovery-cache-settings-store";

function readField(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function updateDiscoveryCacheSettings(formData: FormData) {
  await requireRole(["admin"]);

  const result = await saveDiscoveryCacheSettings({
    cacheEnabled: readField(formData, "cacheEnabled") === "on",
    ttlSeconds: readField(formData, "ttlSeconds"),
  });

  if (!result.ok) {
    return result;
  }

  // Drop in-memory pages so the new TTL/on-off takes effect immediately.
  clearDiscoveryFeedCache();
  revalidatePath("/dashboard/admin/discovery-cache");
  return { ok: true as const, error: null };
}
