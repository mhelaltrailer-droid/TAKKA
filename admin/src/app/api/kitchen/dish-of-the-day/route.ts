import { ApprovalStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeDishOfTheDay } from "@/lib/deals";

type DishPayload = {
  menuItemId?: string | null;
  dishOfTheDayPrice?: number;
  dishOfTheDayQty?: number | null;
  clear?: boolean;
};

export async function GET() {
  try {
    const user = await requireAuth();
    const kitchen = await db.kitchen.findUnique({
      where: { ownerUserId: user.appUserId },
      select: { id: true },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا." },
        { status: 404 },
      );
    }

    const item = await db.menuItem.findFirst({
      where: {
        kitchenId: kitchen.id,
        isDishOfTheDay: true,
        isAvailable: true,
        approvalStatus: ApprovalStatus.APPROVED,
      },
    });

    return NextResponse.json({
      dishOfTheDay: item
        ? serializeDishOfTheDay({ ...item, kitchenId: kitchen.id })
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل طبق اليوم.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as DishPayload;

    const kitchen = await db.kitchen.findUnique({
      where: { ownerUserId: user.appUserId },
      select: { id: true, approvalStatus: true },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا." },
        { status: 404 },
      );
    }

    if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: "يجب اعتماد المطبخ قبل تعيين طبق اليوم." },
        { status: 403 },
      );
    }

    if (payload.clear || !payload.menuItemId) {
      await db.menuItem.updateMany({
        where: { kitchenId: kitchen.id, isDishOfTheDay: true },
        data: {
          isDishOfTheDay: false,
          dishOfTheDayPrice: null,
          dishOfTheDayQty: null,
        },
      });
      return NextResponse.json({ dishOfTheDay: null });
    }

    const price = Number(payload.dishOfTheDayPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "سعر طبق اليوم غير صالح." },
        { status: 400 },
      );
    }

    const qty =
      payload.dishOfTheDayQty === null || payload.dishOfTheDayQty === undefined
        ? null
        : Number(payload.dishOfTheDayQty);

    if (qty != null && (!Number.isInteger(qty) || qty < 0)) {
      return NextResponse.json(
        { error: "كمية طبق اليوم غير صالحة." },
        { status: 400 },
      );
    }

    const menuItem = await db.menuItem.findFirst({
      where: {
        id: payload.menuItemId,
        kitchenId: kitchen.id,
        approvalStatus: ApprovalStatus.APPROVED,
        isAvailable: true,
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: "الصنف غير موجود أو غير معتمد." },
        { status: 404 },
      );
    }

    if (price >= Number(menuItem.basePrice)) {
      return NextResponse.json(
        { error: "سعر طبق اليوم يجب أن يكون أقل من السعر العادي." },
        { status: 400 },
      );
    }

    await db.$transaction([
      db.menuItem.updateMany({
        where: { kitchenId: kitchen.id, isDishOfTheDay: true },
        data: {
          isDishOfTheDay: false,
          dishOfTheDayPrice: null,
          dishOfTheDayQty: null,
        },
      }),
      db.menuItem.update({
        where: { id: menuItem.id },
        data: {
          isDishOfTheDay: true,
          dishOfTheDayPrice: price,
          dishOfTheDayQty: qty,
        },
      }),
    ]);

    const updated = await db.menuItem.findUnique({ where: { id: menuItem.id } });

    return NextResponse.json({
      dishOfTheDay: updated
        ? serializeDishOfTheDay({ ...updated, kitchenId: kitchen.id })
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حفظ طبق اليوم.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
