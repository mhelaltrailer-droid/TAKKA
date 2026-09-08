import { NotificationType, OrderStatus } from "@prisma/client";
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

    const order = await db.order.findFirst({
      where: {
        id,
        customerId: user.appUserId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        kitchen: {
          select: {
            ownerUserId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    if (order.status !== OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM) {
      return NextResponse.json(
        { error: "هذا الطلب ليس في مرحلة تأكيد الاستلام." },
        { status: 400 },
      );
    }

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await createNotification({
      userId: order.kitchen.ownerUserId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "أكد العميل الاستلام",
      body: `أكد العميل استلام الطلب ${order.orderNumber}.`,
    });

    await triggerOrderEvent(order.id, "status:changed", {
      orderId: order.id,
      status: OrderStatus.COMPLETED,
    });

    return NextResponse.json({ ok: true, status: OrderStatus.COMPLETED });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تأكيد استلام الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
