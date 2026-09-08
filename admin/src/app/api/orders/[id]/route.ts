import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
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
      include: {
        kitchen: {
          select: {
            kitchenName: true,
            slug: true,
          },
        },
        customerAddress: {
          include: {
            region: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
        depositProofs: {
          orderBy: {
            submittedAt: "desc",
          },
        },
        review: true,
        messages: {
          orderBy: {
            sentAt: "asc",
          },
          include: {
            sender: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل تفاصيل الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
