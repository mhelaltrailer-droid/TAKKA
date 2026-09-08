import { NotificationType, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getAllowedNextStatuses } from "@/lib/order-status";
import { triggerOrderEvent } from "@/lib/pusher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as { nextStatus?: OrderStatus };

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
        deliveryType: true,
        customerId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    if (!payload.nextStatus) {
      return NextResponse.json(
        { error: "الحالة التالية مطلوبة." },
        { status: 400 },
      );
    }

    const allowedStatuses = getAllowedNextStatuses(order.status, order.deliveryType);

    if (!allowedStatuses.includes(payload.nextStatus)) {
      return NextResponse.json(
        { error: "الانتقال المطلوب غير مسموح لهذه الحالة." },
        { status: 400 },
      );
    }

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: payload.nextStatus,
        ...(payload.nextStatus === OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER
          ? { deliveredAt: new Date() }
          : {}),
        ...(payload.nextStatus === OrderStatus.COMPLETED
          ? { completedAt: new Date() }
          : {}),
      },
    });

    await createNotification({
      userId: order.customerId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "تم تحديث حالة الطلب",
      body: `حالة الطلب ${order.orderNumber} أصبحت ${payload.nextStatus}.`,
    });

    await triggerOrderEvent(order.id, "status:changed", {
      orderId: order.id,
      status: payload.nextStatus,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث حالة الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
