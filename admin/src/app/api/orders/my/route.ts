import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuth();

    const orders = await db.order.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        kitchen: {
          select: {
            kitchenName: true,
            slug: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الطلبات.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
