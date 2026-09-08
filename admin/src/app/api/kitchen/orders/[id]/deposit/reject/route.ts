import { DepositReviewStatus, NotificationType, OrderStatus } from "@prisma/client";
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
      include: {
        depositProofs: {
          orderBy: {
            submittedAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    if (order.status !== OrderStatus.DEPOSIT_PROOF_SUBMITTED) {
      return NextResponse.json(
        { error: "هذا الطلب ليس في مرحلة مراجعة إثبات العربون." },
        { status: 400 },
      );
    }

    const latestProof = order.depositProofs[0];

    if (!latestProof) {
      return NextResponse.json(
        { error: "لا يوجد إثبات عربون لمراجعته." },
        { status: 404 },
      );
    }

    await db.depositProof.update({
      where: {
        id: latestProof.id,
      },
      data: {
        reviewStatus: DepositReviewStatus.REJECTED,
        reviewedByUserId: user.appUserId,
        reviewedAt: new Date(),
        reviewNotes: "تم رفض الإثبات ويحتاج العميل إلى إعادة الإرسال.",
      },
    });

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
      },
    });

    await createNotification({
      userId: order.customerId,
      orderId: order.id,
      type: NotificationType.DEPOSIT,
      title: "تم رفض إثبات العربون",
      body: `يرجى إعادة إرسال إثبات العربون للطلب ${order.orderNumber}.`,
    });

    await triggerOrderEvent(order.id, "deposit:updated", {
      orderId: order.id,
      status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر رفض إثبات العربون.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
