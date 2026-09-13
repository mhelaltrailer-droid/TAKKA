import { ApprovalStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFoodCategoryId } from "@/lib/food-categories";
import {
  KITCHEN_NOT_APPROVED_MENU_MESSAGE,
  serializePendingSizes,
} from "@/lib/moderation";
import { parseOrderReadiness } from "@/lib/order-readiness";

type MenuPayload = {
  name: string;
  description?: string;
  categoryId?: string;
  orderReadiness?: string;
  basePrice: number;
  depositAmount: number;
  imageUrl?: string;
  sizes?: Array<{
    sizeName: string;
    price: number;
    depositAmount?: number | null;
  }>;
};

export async function GET() {
  try {
    const user = await requireAuth();
    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      include: {
        menuItems: {
          include: {
            sizes: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    return NextResponse.json({ kitchen, menuItems: kitchen.menuItems });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل المنيو.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as MenuPayload;

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
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: KITCHEN_NOT_APPROVED_MENU_MESSAGE },
        { status: 403 },
      );
    }

    if (!payload.name) {
      return NextResponse.json({ error: "اسم الصنف مطلوب." }, { status: 400 });
    }

    const categoryId = payload.categoryId?.trim() ?? "";
    if (!categoryId || !isFoodCategoryId(categoryId)) {
      return NextResponse.json(
        { error: "اختر فئة الوجبة من قائمة تاكل ايه؟" },
        { status: 400 },
      );
    }

    const orderReadiness = parseOrderReadiness(payload.orderReadiness);

    if (payload.depositAmount > payload.basePrice * 0.6) {
      return NextResponse.json(
        { error: "العربون لا يجب أن يتجاوز 60% من سعر الصنف." },
        { status: 400 },
      );
    }

    const createdItem = await db.menuItem.create({
      data: {
        kitchenId: kitchen.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        imageUrl: payload.imageUrl?.trim() || null,
        categoryId,
        orderReadiness,
        basePrice: payload.basePrice.toFixed(2),
        depositAmount: payload.depositAmount.toFixed(2),
        isAvailable: true,
        approvalStatus: ApprovalStatus.PENDING,
        rejectionReason: null,
      },
    });

    const sizes = (payload.sizes ?? []).filter(
      (size) => size.sizeName.trim() && Number.isFinite(size.price),
    );

    if (sizes.length) {
      for (const size of sizes) {
        if (size.depositAmount !== undefined && size.depositAmount !== null) {
          if (size.depositAmount > size.price * 0.6) {
            return NextResponse.json(
              {
                error: `عربون الحجم "${size.sizeName}" لا يجب أن يتجاوز 60% من السعر.`,
              },
              { status: 400 },
            );
          }
        }
      }

      await db.menuItemSize.createMany({
        data: sizes.map((size) => ({
          menuItemId: createdItem.id,
          sizeName: size.sizeName.trim(),
          price: size.price.toFixed(2),
          depositAmount: size.depositAmount?.toFixed(2) ?? null,
          isActive: true,
        })),
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إنشاء الصنف.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Update item: pending/rejected edits live fields; approved edits become draft. */
export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as MenuPayload & { id: string };

    const kitchen = await db.kitchen.findUnique({
      where: { ownerUserId: user.appUserId },
      select: { id: true, approvalStatus: true },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: KITCHEN_NOT_APPROVED_MENU_MESSAGE },
        { status: 403 },
      );
    }

    const menuItem = await db.menuItem.findFirst({
      where: { id: payload.id, kitchenId: kitchen.id },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "الصنف غير موجود." }, { status: 404 });
    }

    const categoryId = payload.categoryId?.trim() ?? "";
    if (!payload.name?.trim()) {
      return NextResponse.json({ error: "اسم الصنف مطلوب." }, { status: 400 });
    }
    if (!categoryId || !isFoodCategoryId(categoryId)) {
      return NextResponse.json(
        { error: "اختر فئة الوجبة من قائمة تاكل ايه؟" },
        { status: 400 },
      );
    }

    const orderReadiness = parseOrderReadiness(payload.orderReadiness);

    const sizes = (payload.sizes ?? [])
      .filter((size) => size.sizeName.trim() && Number.isFinite(size.price))
      .map((size) => ({
        sizeName: size.sizeName.trim(),
        price: size.price.toFixed(2),
        depositAmount: size.depositAmount?.toFixed(2) ?? null,
      }));

    if (
      menuItem.approvalStatus === ApprovalStatus.PENDING ||
      menuItem.approvalStatus === ApprovalStatus.REJECTED
    ) {
      await db.menuItem.update({
        where: { id: menuItem.id },
        data: {
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          imageUrl: payload.imageUrl?.trim() || null,
          categoryId,
          orderReadiness,
          basePrice: payload.basePrice.toFixed(2),
          depositAmount: payload.depositAmount.toFixed(2),
          approvalStatus: ApprovalStatus.PENDING,
          rejectionReason: null,
        },
      });
      await db.menuItemSize.deleteMany({ where: { menuItemId: menuItem.id } });
      if (sizes.length) {
        await db.menuItemSize.createMany({
          data: sizes.map((size) => ({
            menuItemId: menuItem.id,
            ...size,
            isActive: true,
          })),
        });
      }
    } else {
      await db.menuItem.update({
        where: { id: menuItem.id },
        data: {
          orderReadiness,
          pendingName: payload.name.trim(),
          pendingDescription: payload.description?.trim() || null,
          pendingImageUrl: payload.imageUrl?.trim() || null,
          pendingCategoryId: categoryId,
          pendingBasePrice: payload.basePrice.toFixed(2),
          pendingDepositAmount: payload.depositAmount.toFixed(2),
          pendingSizesJson: serializePendingSizes(sizes),
          draftStatus: ApprovalStatus.PENDING,
          draftRejectionReason: null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث الصنف.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
