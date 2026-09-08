"use server";

import { ApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function approveKitchen(formData: FormData) {
  await requireRole(["admin"]);

  const kitchenId = getString(formData, "kitchenId");

  await db.kitchen.update({
    where: {
      id: kitchenId,
    },
    data: {
      approvalStatus: ApprovalStatus.APPROVED,
    },
  });

  revalidatePath("/dashboard/admin");
}

export async function rejectKitchen(formData: FormData) {
  await requireRole(["admin"]);

  const kitchenId = getString(formData, "kitchenId");

  await db.kitchen.update({
    where: {
      id: kitchenId,
    },
    data: {
      approvalStatus: ApprovalStatus.REJECTED,
    },
  });

  revalidatePath("/dashboard/admin");
}

export async function toggleRegionStatus(formData: FormData) {
  await requireRole(["admin"]);

  const regionId = getString(formData, "regionId");
  const region = await db.region.findUnique({
    where: {
      id: regionId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!region) {
    throw new Error("المنطقة غير موجودة.");
  }

  await db.region.update({
    where: {
      id: region.id,
    },
    data: {
      isActive: !region.isActive,
    },
  });

  revalidatePath("/dashboard/admin");
}
