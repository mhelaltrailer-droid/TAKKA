"use server";

import { ApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  applyApprovedMenuDraft,
  notifyKitchenOwner,
} from "@/lib/moderation";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function approveKitchen(formData: FormData) {
  await requireRole(["admin"]);

  const kitchenId = getString(formData, "kitchenId");

  const kitchen = await db.kitchen.update({
    where: { id: kitchenId },
    data: {
      approvalStatus: ApprovalStatus.APPROVED,
      rejectionReason: null,
      reviewedAt: new Date(),
    },
    select: {
      kitchenName: true,
      ownerUserId: true,
    },
  });

  await notifyKitchenOwner({
    ownerUserId: kitchen.ownerUserId,
    title: "تم اعتماد المطبخ",
    body: `تمت الموافقة على مطبخ «${kitchen.kitchenName}». يمكنك الآن إضافة الأصناف.`,
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/kitchens");
  revalidatePath(`/dashboard/admin/kitchens/${kitchenId}`);
  revalidatePath("/dashboard/kitchen/onboarding");
  revalidatePath("/dashboard/menu");
}

export async function rejectKitchen(formData: FormData) {
  await requireRole(["admin"]);

  const kitchenId = getString(formData, "kitchenId");
  const rejectionReason = getString(formData, "rejectionReason");

  if (!rejectionReason) {
    throw new Error("سبب الرفض مطلوب.");
  }

  const kitchen = await db.kitchen.update({
    where: { id: kitchenId },
    data: {
      approvalStatus: ApprovalStatus.REJECTED,
      rejectionReason,
      reviewedAt: new Date(),
      availabilityStatus: "CLOSED",
    },
    select: {
      kitchenName: true,
      ownerUserId: true,
    },
  });

  await notifyKitchenOwner({
    ownerUserId: kitchen.ownerUserId,
    title: "تم رفض اعتماد المطبخ",
    body: `تم رفض مطبخ «${kitchen.kitchenName}». السبب: ${rejectionReason}`,
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/kitchens");
  revalidatePath(`/dashboard/admin/kitchens/${kitchenId}`);
  revalidatePath("/dashboard/kitchen/onboarding");
}

export async function approveMenuItem(formData: FormData) {
  await requireRole(["admin"]);

  const menuItemId = getString(formData, "menuItemId");
  const item = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      kitchen: { select: { ownerUserId: true, kitchenName: true } },
    },
  });

  if (!item) {
    throw new Error("الصنف غير موجود.");
  }

  if (item.draftStatus === ApprovalStatus.PENDING) {
    await applyApprovedMenuDraft(menuItemId);
    await notifyKitchenOwner({
      ownerUserId: item.kitchen.ownerUserId,
      title: "تم اعتماد تعديل الصنف",
      body: `تمت الموافقة على تعديلات «${item.pendingName ?? item.name}» في مطبخ ${item.kitchen.kitchenName}.`,
    });
  } else if (item.approvalStatus === ApprovalStatus.PENDING) {
    await db.menuItem.update({
      where: { id: menuItemId },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        rejectionReason: null,
      },
    });
    await notifyKitchenOwner({
      ownerUserId: item.kitchen.ownerUserId,
      title: "تم اعتماد الصنف",
      body: `تمت الموافقة على «${item.name}» وأصبح ظاهرًا للعملاء.`,
    });
  } else {
    throw new Error("لا يوجد طلب اعتماد معلّق لهذا الصنف.");
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/menu-items");
  revalidatePath(`/dashboard/admin/menu-items/${menuItemId}`);
  revalidatePath("/dashboard/menu");
  revalidatePath("/kitchens");
}

export async function rejectMenuItem(formData: FormData) {
  await requireRole(["admin"]);

  const menuItemId = getString(formData, "menuItemId");
  const rejectionReason = getString(formData, "rejectionReason");

  if (!rejectionReason) {
    throw new Error("سبب الرفض مطلوب.");
  }

  const item = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      kitchen: { select: { ownerUserId: true, kitchenName: true } },
    },
  });

  if (!item) {
    throw new Error("الصنف غير موجود.");
  }

  if (item.draftStatus === ApprovalStatus.PENDING) {
    await db.menuItem.update({
      where: { id: menuItemId },
      data: {
        draftStatus: ApprovalStatus.REJECTED,
        draftRejectionReason: rejectionReason,
      },
    });
    await notifyKitchenOwner({
      ownerUserId: item.kitchen.ownerUserId,
      title: "تم رفض تعديل الصنف",
      body: `رُفضت تعديلات «${item.pendingName ?? item.name}». السبب: ${rejectionReason}`,
    });
  } else if (item.approvalStatus === ApprovalStatus.PENDING) {
    await db.menuItem.update({
      where: { id: menuItemId },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        rejectionReason,
        isAvailable: false,
      },
    });
    await notifyKitchenOwner({
      ownerUserId: item.kitchen.ownerUserId,
      title: "تم رفض الصنف",
      body: `رُفض «${item.name}». السبب: ${rejectionReason}`,
    });
  } else {
    throw new Error("لا يوجد طلب اعتماد معلّق لهذا الصنف.");
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/menu-items");
  revalidatePath(`/dashboard/admin/menu-items/${menuItemId}`);
  revalidatePath("/dashboard/menu");
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
  revalidatePath("/dashboard/admin/districts");
}
