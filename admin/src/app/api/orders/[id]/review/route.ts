import { NotificationType, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { triggerOrderEvent } from "@/lib/pusher";
import { recalculateKitchenRating } from "@/lib/reviews";

type ReviewPayload = {
  ratingValue: number;
  comment?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as ReviewPayload;

    const order = await db.order.findFirst({
      where: {
        id,
        customerId: user.appUserId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        kitchenId: true,
        kitchen: {
          select: {
            ownerUserId: true,
          },
        },
        review: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    if (order.status !== OrderStatus.COMPLETED) {
      return NextResponse.json(
        { error: "لا يمكن تقييم الطلب قبل اكتماله." },
        { status: 400 },
      );
    }

    if (order.review) {
      return NextResponse.json(
        { error: "تم إرسال تقييم لهذا الطلب بالفعل." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(payload.ratingValue) ||
      payload.ratingValue < 1 ||
      payload.ratingValue > 5
    ) {
      return NextResponse.json(
        { error: "التقييم يجب أن يكون بين 1 و 5." },
        { status: 400 },
      );
    }

    const review = await db.review.create({
      data: {
        orderId: order.id,
        customerId: user.appUserId,
        kitchenId: order.kitchenId,
        ratingValue: payload.ratingValue,
        comment: payload.comment?.trim() || null,
      },
    });

    await recalculateKitchenRating(order.kitchenId);

    await createNotification({
      userId: order.kitchen.ownerUserId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "تقييم جديد",
      body: `أضاف العميل تقييمًا جديدًا للطلب ${order.orderNumber}.`,
    });

    await triggerOrderEvent(order.id, "review:created", {
      orderId: order.id,
      ratingValue: review.ratingValue,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حفظ التقييم.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
