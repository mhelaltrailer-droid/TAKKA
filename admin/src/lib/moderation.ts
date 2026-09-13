import { ApprovalStatus, NotificationType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export const KITCHEN_NOT_APPROVED_MENU_MESSAGE =
  "انتظر اعتماد المطبخ أولا ثم ابدأ في إضافة الأصناف";

type PendingSize = {
  sizeName: string;
  price: string;
  depositAmount: string | null;
};

export function serializePendingSizes(sizes: PendingSize[]) {
  return JSON.stringify(sizes);
}

export function parsePendingSizes(raw: string | null | undefined): PendingSize[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PendingSize[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function notifyKitchenOwner(params: {
  ownerUserId: string;
  title: string;
  body: string;
}) {
  await createNotification({
    userId: params.ownerUserId,
    type: NotificationType.SYSTEM,
    title: params.title,
    body: params.body,
  });
}

export async function applyApprovedMenuDraft(menuItemId: string) {
  const item = await db.menuItem.findUnique({
    where: { id: menuItemId },
    include: { sizes: true },
  });

  if (!item || item.draftStatus !== ApprovalStatus.PENDING) {
    throw new Error("لا توجد مسودة معلّقة لهذا الصنف.");
  }

  const pendingSizes = parsePendingSizes(item.pendingSizesJson);

  await db.$transaction(async (tx) => {
    await tx.menuItem.update({
      where: { id: menuItemId },
      data: {
        name: item.pendingName ?? item.name,
        description:
          item.pendingDescription !== undefined
            ? item.pendingDescription
            : item.description,
        imageUrl:
          item.pendingImageUrl !== undefined
            ? item.pendingImageUrl
            : item.imageUrl,
        categoryId: item.pendingCategoryId ?? item.categoryId,
        basePrice: item.pendingBasePrice ?? item.basePrice,
        depositAmount: item.pendingDepositAmount ?? item.depositAmount,
        draftStatus: null,
        draftRejectionReason: null,
        pendingName: null,
        pendingDescription: null,
        pendingImageUrl: null,
        pendingCategoryId: null,
        pendingBasePrice: null,
        pendingDepositAmount: null,
        pendingSizesJson: null,
      },
    });

    if (item.pendingSizesJson != null) {
      await tx.menuItemSize.deleteMany({ where: { menuItemId } });
      if (pendingSizes.length) {
        await tx.menuItemSize.createMany({
          data: pendingSizes.map((size) => ({
            menuItemId,
            sizeName: size.sizeName,
            price: size.price,
            depositAmount: size.depositAmount,
            isActive: true,
          })),
        });
      }
    }
  });
}

export function menuItemNeedsAdminReviewWhere(): Prisma.MenuItemWhereInput {
  return {
    kitchen: { approvalStatus: ApprovalStatus.APPROVED },
    OR: [
      { approvalStatus: ApprovalStatus.PENDING },
      { draftStatus: ApprovalStatus.PENDING },
    ],
  };
}
