"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { saveImageDisplaySettings } from "@/lib/image-display-settings";

function readField(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function updateImageDisplaySettings(formData: FormData) {
  await requireRole(["admin"]);

  const result = await saveImageDisplaySettings({
    watermarkEnabled: readField(formData, "watermarkEnabled") === "on",
    enhancementEnabled: readField(formData, "enhancementEnabled") === "on",
    watermarkPosition: readField(formData, "watermarkPosition"),
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dashboard/admin/image-settings");
  return { ok: true as const, error: null };
}
