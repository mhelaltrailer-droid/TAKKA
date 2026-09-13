import { NotificationType, OrderStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { canCustomerCancelOrder } from "@/lib/customer-order-status";
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

    if (!canCustomerCancelOrder(order.status)) {
      return NextResponse.json(
        {
          error:
            "لا يمكن إلغاء الطلب بعد تأكيد العربون. العربون يعني التزام الطرفين بالتنفيذ.",
        },
        { status: 400 },
      );
    }

    const hadDepositProof =
      order.status === OrderStatus.DEPOSIT_PROOF_SUBMITTED;

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.CANCELLED_BEFORE_DEPOSIT,
        cancelledBy: UserRole.CUSTOMER,
        cancelReason: hadDepositProof
          ? "ألغاه العميل بعد إرسال إثبات العربون وقبل تأكيد المطبخ."
          : "ألغاه العميل قبل تأكيد العربون.",
        cancelledAt: new Date(),
      },
    });

    await createNotification({
      userId: order.kitchen.ownerUserId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "تم إلغاء الطلب",
      body: `ألغى العميل الطلب ${order.orderNumber}.`,
    });

    await triggerOrderEvent(order.id, "status:changed", {
      orderId: order.id,
      status: OrderStatus.CANCELLED_BEFORE_DEPOSIT,
    });

    return NextResponse.json({
      ok: true,
      status: OrderStatus.CANCELLED_BEFORE_DEPOSIT,
      hadDepositProof,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إلغاء الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
