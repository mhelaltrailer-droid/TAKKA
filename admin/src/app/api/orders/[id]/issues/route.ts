import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOrderIssueType } from "@/lib/order-issues";

const NOTE_MAX = 500;

type IssuePayload = {
  type?: string;
  note?: string;
};

/**
 * Logs a customer complaint. Does not send WhatsApp, email, or any other
 * outbound message — the client opens WhatsApp itself after this succeeds.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as IssuePayload;
    const type = payload.type?.trim() ?? "";

    if (!isOrderIssueType(type)) {
      return NextResponse.json(
        { error: "اختار نوع المشكلة الأول." },
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
        kitchenId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    const note = payload.note?.trim().slice(0, NOTE_MAX) || null;
    const issue = await db.orderIssue.create({
      data: {
        orderId: order.id,
        customerId: user.appUserId,
        kitchenId: order.kitchenId,
        type,
        note,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تسجيل المشكلة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
