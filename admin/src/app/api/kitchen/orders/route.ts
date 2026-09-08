import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuth();

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

    const orders = await db.order.findMany({
      where: {
        kitchenId: kitchen.id,
      },
      include: {
        customer: {
          select: {
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        customerAddress: {
          include: {
            region: true,
          },
        },
        depositProofs: {
          orderBy: {
            submittedAt: "desc",
          },
          take: 1,
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
      error instanceof Error ? error.message : "تعذر تحميل طلبات المطبخ.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
