import { MessageType, NotificationType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { triggerOrderEvent } from "@/lib/pusher";

type MessagePayload = {
  text?: string;
  imageUrl?: string;
};

async function getAccessibleOrder(orderId: string, userId: string) {
  return db.order.findFirst({
    where: {
      id: orderId,
      OR: [
        { customerId: userId },
        {
          kitchen: {
            ownerUserId: userId,
          },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      customerId: true,
      kitchen: {
        select: {
          ownerUserId: true,
        },
      },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const order = await getAccessibleOrder(id, user.appUserId);

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    const messages = await db.orderMessage.findMany({
      where: {
        orderId: order.id,
      },
      orderBy: {
        sentAt: "asc",
      },
      select: {
        id: true,
        messageType: true,
        messageText: true,
        fileUrl: true,
        sentAt: true,
        sender: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الرسائل.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as MessagePayload;

    const order = await getAccessibleOrder(id, user.appUserId);

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    if (
      order.status === "PENDING_KITCHEN_APPROVAL" ||
      order.status === "REJECTED_BY_KITCHEN"
    ) {
      return NextResponse.json(
        { error: "المحادثة غير متاحة قبل قبول الطلب." },
        { status: 400 },
      );
    }

    const text = payload.text?.trim() ?? "";
    const imageUrl = payload.imageUrl?.trim() ?? "";

    if (!text && !imageUrl) {
      return NextResponse.json(
        { error: "الرسالة تحتاج نصًا أو صورة." },
        { status: 400 },
      );
    }

    const createdMessage = await db.orderMessage.create({
      data: {
        orderId: order.id,
        senderUserId: user.appUserId,
        messageType: imageUrl ? MessageType.IMAGE : MessageType.TEXT,
        messageText: text || null,
        fileUrl: imageUrl || null,
      },
      select: {
        id: true,
        messageType: true,
        messageText: true,
        fileUrl: true,
        sentAt: true,
      },
    });

    const receiverUserId =
      user.role === "kitchen_owner" || user.role === "admin"
        ? order.customerId
        : order.kitchen.ownerUserId;

    await createNotification({
      userId: receiverUserId,
      orderId: order.id,
      type: NotificationType.CHAT,
      title:
        user.role === "kitchen_owner" || user.role === "admin"
          ? "رسالة جديدة من المطبخ"
          : "رسالة جديدة من العميل",
      body: `وصلت رسالة جديدة بخصوص الطلب ${order.orderNumber}.`,
    });

    await triggerOrderEvent(order.id, "message:new", createdMessage);

    return NextResponse.json({ message: createdMessage }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إرسال الرسالة.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
