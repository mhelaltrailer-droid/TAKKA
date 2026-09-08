import { DeliveryType, NotificationType, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { triggerOrderEvent } from "@/lib/pusher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as { deliveryFee?: number };

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
        subtotalAmount: true,
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

    const deliveryFee =
      order.deliveryType === DeliveryType.DELIVERY
        ? Number(payload.deliveryFee ?? 0)
        : 0;

    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      return NextResponse.json(
        { error: "رسوم التوصيل غير صحيحة." },
        { status: 400 },
      );
    }

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        deliveryFee: deliveryFee.toFixed(2),
        totalAmount: order.subtotalAmount.add(deliveryFee),
        status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
        acceptedAt: new Date(),
      },
    });

    await createNotification({
      userId: order.customerId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "تم قبول الطلب",
      body: `تم قبول طلبك ${order.orderNumber} ويمكنك الآن إرسال العربون.`,
    });

    await triggerOrderEvent(order.id, "status:changed", {
      orderId: order.id,
      status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر قبول الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
