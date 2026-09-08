import { NotificationType, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { triggerOrderEvent } from "@/lib/pusher";

type DepositProofPayload = {
  imageUrl: string;
  submittedAmount?: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as DepositProofPayload;

    if (!payload.imageUrl) {
      return NextResponse.json(
        { error: "رابط صورة إثبات العربون مطلوب." },
        { status: 400 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        id,
        customerId: user.appUserId,
      },
      select: {
        id: true,
        status: true,
        orderNumber: true,
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

    if (
      order.status !== OrderStatus.ACCEPTED_AWAITING_DEPOSIT &&
      order.status !== OrderStatus.DEPOSIT_PROOF_SUBMITTED
    ) {
      return NextResponse.json(
        { error: "هذا الطلب غير متاح حاليًا لاستقبال إثبات العربون." },
        { status: 400 },
      );
    }

    const proof = await db.depositProof.create({
      data: {
        orderId: order.id,
        uploadedByUserId: user.appUserId,
        imageUrl: payload.imageUrl,
        submittedAmount:
          typeof payload.submittedAmount === "number"
            ? payload.submittedAmount.toFixed(2)
            : null,
      },
    });

    await db.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.DEPOSIT_PROOF_SUBMITTED,
        depositSubmittedAt: new Date(),
      },
    });

    await createNotification({
      userId: order.kitchen.ownerUserId,
      orderId: order.id,
      type: NotificationType.DEPOSIT,
      title: "تم إرسال إثبات عربون",
      body: `أرسل العميل إثبات العربون للطلب ${order.orderNumber}.`,
    });

    await triggerOrderEvent(order.id, "deposit:updated", {
      orderId: order.id,
      status: OrderStatus.DEPOSIT_PROOF_SUBMITTED,
    });

    return NextResponse.json(
      {
        proofId: proof.id,
        status: OrderStatus.DEPOSIT_PROOF_SUBMITTED,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ أثناء رفع إثبات العربون.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
