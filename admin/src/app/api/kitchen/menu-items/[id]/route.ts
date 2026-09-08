import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as { isAvailable?: boolean };

    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      select: {
        id: true,
      },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    const updated = await db.menuItem.updateMany({
      where: {
        id,
        kitchenId: kitchen.id,
      },
      data: {
        isAvailable: payload.isAvailable ?? true,
      },
    });

    if (!updated.count) {
      return NextResponse.json({ error: "الصنف غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث الصنف.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      select: {
        id: true,
      },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    await db.menuItem.deleteMany({
      where: {
        id,
        kitchenId: kitchen.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حذف الصنف.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
