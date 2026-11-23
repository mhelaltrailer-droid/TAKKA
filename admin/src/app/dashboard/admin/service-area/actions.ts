"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { saveServiceArea } from "@/lib/service-area-store";

function readField(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function updateServiceArea(formData: FormData) {
  await requireRole(["admin"]);

  const result = await saveServiceArea({
    label: readField(formData, "label"),
    centerLatitude: readField(formData, "centerLatitude"),
    centerLongitude: readField(formData, "centerLongitude"),
    radiusKm: readField(formData, "radiusKm"),
    outOfAreaMessage: readField(formData, "outOfAreaMessage"),
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dashboard/admin/service-area");
  return { ok: true as const, error: null };
}
