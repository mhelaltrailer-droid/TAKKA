"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { saveKitchenOrderPolicy } from "@/lib/kitchen-order-policy";
import { reactivateKitchenAsAdmin } from "@/lib/kitchen-suspension";

function readField(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function updateKitchenOrderPolicy(formData: FormData) {
  await requireRole(["admin"]);

  const result = await saveKitchenOrderPolicy({
    acceptanceTimeoutMinutes: readField(formData, "acceptanceTimeoutMinutes"),
    shortWindowCount: readField(formData, "shortWindowCount"),
    shortWindowHours: readField(formData, "shortWindowHours"),
    longWindowCount: readField(formData, "longWindowCount"),
    longWindowDays: readField(formData, "longWindowDays"),
    customerNoResponseMessage: readField(
      formData,
      "customerNoResponseMessage",
    ),
    level1SuspensionMessage: readField(formData, "level1SuspensionMessage"),
    level2SuspensionMessage: readField(formData, "level2SuspensionMessage"),
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dashboard/admin/kitchen-policy");
  revalidatePath("/dashboard/admin/kitchens");
  return { ok: true as const, error: null };
}

export async function reactivateKitchen(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const kitchenId = readField(formData, "kitchenId");
  if (!kitchenId) {
    return;
  }

  await reactivateKitchenAsAdmin({
    kitchenId,
    adminUserId: admin.appUserId,
  });

  revalidatePath("/dashboard/admin/kitchens");
  revalidatePath(`/dashboard/admin/kitchens/${kitchenId}`);
}
