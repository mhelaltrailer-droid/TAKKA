import { NotificationType, OrderStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { triggerOrderEvent } from "@/lib/pusher";

export async function POST(
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
        { error: "لا يوجد مطبخ مرتبط بحسابك." },
        { status: 404 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        id,
        kitchenId: kitchen.id,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    if (order.status !== OrderStatus.PENDING_KITCHEN_APPROVAL) {
      return NextResponse.json(
        { error: "هذا الطلب لم يعد في مرحلة انتظار القبول." },
        { status: 400 },
      );
    }

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.REJECTED_BY_KITCHEN,
        cancelledBy: UserRole.KITCHEN_OWNER,
        cancelledAt: new Date(),
      },
    });

    await createNotification({
      userId: order.customerId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "تم رفض الطلب",
      body: `تم رفض الطلب ${order.orderNumber} من جهة المطبخ.`,
    });

    await triggerOrderEvent(order.id, "status:changed", {
      orderId: order.id,
      status: OrderStatus.REJECTED_BY_KITCHEN,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر رفض الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
