"use server";

import { ApprovalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFoodCategoryId } from "@/lib/food-categories";
import {
  KITCHEN_NOT_APPROVED_MENU_MESSAGE,
  serializePendingSizes,
} from "@/lib/moderation";
import { parseOrderReadiness } from "@/lib/order-readiness";
import {
  maxDepositAllowed,
  parseOptionalDiscountedPrice,
} from "@/lib/pricing";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseCurrency(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`قيمة ${fieldName} غير صحيحة.`);
  }

  return parsed.toFixed(2);
}

/** Format: sizeName|price|deposit|discountedPrice (deposit and discounted optional). */
function parseSizes(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [sizeName, price, deposit, discounted] = parts;

      if (!sizeName || !price) {
        throw new Error(
          "تنسيق الأحجام غير صحيح. استخدم: اسم الحجم|السعر|العربون|السعر بعد الخصم",
        );
      }

      const parsedPrice = Number(price);
      const parsedDeposit = deposit ? Number(deposit) : null;
      const discountedPrice = parseOptionalDiscountedPrice(
        discounted,
        parsedPrice,
        `السعر بعد الخصم للحجم "${sizeName}"`,
      );

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error(`سعر الحجم "${sizeName}" غير صحيح.`);
      }

      if (parsedDeposit !== null) {
        if (!Number.isFinite(parsedDeposit) || parsedDeposit < 0) {
          throw new Error(`عربون الحجم "${sizeName}" غير صحيح.`);
        }

        const maxDep = maxDepositAllowed(
          parsedPrice,
          discountedPrice != null ? Number(discountedPrice) : null,
        );
        if (parsedDeposit > maxDep) {
          throw new Error(
            `عربون الحجم "${sizeName}" لا يجب أن يتجاوز 60% من السعر بعد الخصم إن وُجد وإلا السعر.`,
          );
        }
      }

      return {
        sizeName,
        price: parsedPrice.toFixed(2),
        discountedPrice,
        depositAmount: parsedDeposit?.toFixed(2) ?? null,
      };
    });
}

async function requireKitchenOwnerKitchen() {
  const user = await requireAuth();
  const kitchen = await db.kitchen.findUnique({
    where: {
      ownerUserId: user.appUserId,
    },
    select: {
      id: true,
      approvalStatus: true,
    },
  });

  if (!kitchen) {
    throw new Error("يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو.");
  }

  return kitchen;
}

export async function createMenuItem(formData: FormData) {
  const kitchen = await requireKitchenOwnerKitchen();

  if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
    throw new Error(KITCHEN_NOT_APPROVED_MENU_MESSAGE);
  }

  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const categoryId = getString(formData, "categoryId");
  const orderReadiness = parseOrderReadiness(
    getString(formData, "orderReadiness"),
  );
  const basePrice = parseCurrency(getString(formData, "basePrice"), "السعر");
  const discountedPrice = parseOptionalDiscountedPrice(
    getString(formData, "discountedPrice"),
    Number(basePrice),
  );
  const depositAmount = parseCurrency(getString(formData, "depositAmount"), "العربون");
  const imageUrl = getString(formData, "imageUrl");
  const sizesInput = getString(formData, "sizes");

  if (!name) {
    throw new Error("اسم الصنف مطلوب.");
  }

  if (!categoryId || !isFoodCategoryId(categoryId)) {
    throw new Error("اختر فئة الوجبة من قائمة تاكل ايه؟");
  }

  if (
    Number(depositAmount) >
    maxDepositAllowed(
      Number(basePrice),
      discountedPrice != null ? Number(discountedPrice) : null,
    )
  ) {
    throw new Error(
      "العربون لا يجب أن يتجاوز 60% من السعر بعد الخصم إن وُجد وإلا السعر الأساسي.",
    );
  }

  const createdItem = await db.menuItem.create({
    data: {
      kitchenId: kitchen.id,
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      categoryId,
      orderReadiness,
      basePrice,
      discountedPrice,
      depositAmount,
      isAvailable: true,
      approvalStatus: ApprovalStatus.PENDING,
      rejectionReason: null,
    },
  });

  const parsedSizes = parseSizes(sizesInput);

  if (parsedSizes.length) {
    await db.menuItemSize.createMany({
      data: parsedSizes.map((size) => ({
        menuItemId: createdItem.id,
        sizeName: size.sizeName,
        price: size.price,
        discountedPrice: size.discountedPrice,
        depositAmount: size.depositAmount,
        isActive: true,
      })),
    });
  }

  revalidatePath("/dashboard/menu");
}

export async function updateMenuItem(formData: FormData) {
  const kitchen = await requireKitchenOwnerKitchen();

  if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
    throw new Error(KITCHEN_NOT_APPROVED_MENU_MESSAGE);
  }

  const menuItemId = getString(formData, "menuItemId");
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const categoryId = getString(formData, "categoryId");
  const orderReadiness = parseOrderReadiness(
    getString(formData, "orderReadiness"),
  );
  const basePrice = parseCurrency(getString(formData, "basePrice"), "السعر");
  const discountedPrice = parseOptionalDiscountedPrice(
    getString(formData, "discountedPrice"),
    Number(basePrice),
  );
  const depositAmount = parseCurrency(getString(formData, "depositAmount"), "العربون");
  const imageUrl = getString(formData, "imageUrl");
  const sizesInput = getString(formData, "sizes");
  const parsedSizes = parseSizes(sizesInput);

  if (!name) {
    throw new Error("اسم الصنف مطلوب.");
  }
  if (!categoryId || !isFoodCategoryId(categoryId)) {
    throw new Error("اختر فئة الوجبة من قائمة تاكل ايه؟");
  }
  if (
    Number(depositAmount) >
    maxDepositAllowed(
      Number(basePrice),
      discountedPrice != null ? Number(discountedPrice) : null,
    )
  ) {
    throw new Error(
      "العربون لا يجب أن يتجاوز 60% من السعر بعد الخصم إن وُجد وإلا السعر الأساسي.",
    );
  }

  const menuItem = await db.menuItem.findFirst({
    where: { id: menuItemId, kitchenId: kitchen.id },
  });

  if (!menuItem) {
    throw new Error("الصنف غير موجود.");
  }

  if (
    menuItem.approvalStatus === ApprovalStatus.PENDING ||
    menuItem.approvalStatus === ApprovalStatus.REJECTED
  ) {
    await db.menuItem.update({
      where: { id: menuItem.id },
      data: {
        name,
        description: description || null,
        imageUrl: imageUrl || null,
        categoryId,
        orderReadiness,
        basePrice,
        discountedPrice,
        depositAmount,
        approvalStatus: ApprovalStatus.PENDING,
        rejectionReason: null,
      },
    });

    await db.menuItemSize.deleteMany({ where: { menuItemId: menuItem.id } });
    if (parsedSizes.length) {
      await db.menuItemSize.createMany({
        data: parsedSizes.map((size) => ({
          menuItemId: menuItem.id,
          sizeName: size.sizeName,
          price: size.price,
          discountedPrice: size.discountedPrice,
          depositAmount: size.depositAmount,
          isActive: true,
        })),
      });
    }

    revalidatePath("/dashboard/menu");
    return;
  }

  await db.menuItem.update({
    where: { id: menuItem.id },
    data: {
      orderReadiness,
      pendingName: name,
      pendingDescription: description || null,
      pendingImageUrl: imageUrl || null,
      pendingCategoryId: categoryId,
      pendingBasePrice: basePrice,
      pendingDiscountedPrice: discountedPrice,
      pendingDepositAmount: depositAmount,
      pendingSizesJson: serializePendingSizes(parsedSizes),
      draftStatus: ApprovalStatus.PENDING,
      draftRejectionReason: null,
    },
  });

  revalidatePath("/dashboard/menu");
}

export async function toggleMenuItemAvailability(formData: FormData) {
  const kitchen = await requireKitchenOwnerKitchen();
  const menuItemId = getString(formData, "menuItemId");

  const menuItem = await db.menuItem.findFirst({
    where: {
      id: menuItemId,
      kitchenId: kitchen.id,
    },
    select: {
      id: true,
      isAvailable: true,
      approvalStatus: true,
    },
  });

  if (!menuItem) {
    throw new Error("الصنف غير موجود.");
  }

  if (menuItem.approvalStatus !== ApprovalStatus.APPROVED) {
    throw new Error("لا يمكن تفعيل صنف غير معتمد بعد.");
  }

  await db.menuItem.update({
    where: {
      id: menuItem.id,
    },
    data: {
      isAvailable: !menuItem.isAvailable,
    },
  });

  revalidatePath("/dashboard/menu");
}

export async function deleteMenuItem(formData: FormData) {
  const kitchen = await requireKitchenOwnerKitchen();
  const menuItemId = getString(formData, "menuItemId");

  await db.menuItem.deleteMany({
    where: {
      id: menuItemId,
      kitchenId: kitchen.id,
    },
  });

  revalidatePath("/dashboard/menu");
}
