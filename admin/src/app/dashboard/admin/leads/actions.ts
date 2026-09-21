"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { isKitchenJoinStatus } from "@/lib/kitchen-join-leads";

export type LeadActionResult = {
  ok: boolean;
  error?: string;
};

export async function updateKitchenJoinLead(
  formData: FormData,
): Promise<LeadActionResult> {
  try {
    await requireRole(["admin"]);

    const id = formData.get("id")?.toString().trim() ?? "";
    const statusRaw = formData.get("status")?.toString().trim() ?? "";
    const note = formData.get("note")?.toString().trim() ?? "";

    if (!id) {
      return { ok: false, error: "معرّف الليد غير صالح." };
    }
    if (!isKitchenJoinStatus(statusRaw)) {
      return { ok: false, error: "الحالة غير صالحة." };
    }
    if (note.length > 500) {
      return { ok: false, error: "الملاحظة طويلة جدًا." };
    }

    await db.kitchenJoinLead.update({
      where: { id },
      data: {
        status: statusRaw,
        note: note.length > 0 ? note : null,
      },
    });

    revalidatePath("/dashboard/admin/leads");
    revalidatePath("/dashboard/admin");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "تعذر تحديث الليد.";
    return { ok: false, error: message };
  }
}
