"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recalculateKitchenRating } from "@/lib/reviews";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function resolveOrderIssue(formData: FormData) {
  await requireRole(["admin"]);
  const issueId = getString(formData, "issueId");
  if (!issueId) {
    throw new Error("المشكلة مطلوبة.");
  }

  await db.orderIssue.update({
    where: { id: issueId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/orders");
  revalidatePath("/dashboard/admin");
}

export async function setReviewVisibility(formData: FormData) {
  await requireRole(["admin"]);
  const reviewId = getString(formData, "reviewId");
  const visibility = getString(formData, "visibility");
  if (visibility !== "VISIBLE" && visibility !== "HIDDEN") {
    throw new Error("حالة الظهور غير صحيحة.");
  }

  const review = await db.review.update({
    where: { id: reviewId },
    data: { visibility },
    select: {
      kitchenId: true,
      kitchen: { select: { slug: true } },
    },
  });

  await recalculateKitchenRating(review.kitchenId);
  revalidatePath("/dashboard/admin/orders");
  revalidatePath(`/dashboard/admin/kitchens/${review.kitchenId}`);
  revalidatePath(`/kitchens/${review.kitchen.slug}`);
}
