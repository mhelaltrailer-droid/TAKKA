import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOrderStatsSummary,
  resolveStatsDateRange,
} from "@/lib/kitchen-order-stats";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== "kitchen_owner" && user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const kitchen = await db.kitchen.findUnique({
      where: { ownerUserId: user.appUserId },
      select: { id: true, kitchenName: true },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولاً." },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const range = resolveStatsDateRange({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });
    const stats = await getOrderStatsSummary({
      range,
      kitchenId: kitchen.id,
    });

    return NextResponse.json({
      kitchenName: kitchen.kitchenName,
      from: range.fromKey,
      to: range.toKey,
      stats,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الإحصائيات.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
