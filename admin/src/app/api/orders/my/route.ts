import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sweepOverdueKitchenOrders } from "@/lib/kitchen-acceptance-sweep";
import {
  buildOrderCursorArgs,
  parseOrderPageParams,
  toCursorPage,
} from "@/lib/order-cursor-pagination";

/**
 * Response shape: always `{ orders, nextCursor, hasMore }`.
 *
 * Backward compatibility: Flutter (and web) already read `json['orders']`.
 * Extra keys are ignored by old clients. When neither `cursor` nor `limit` is
 * sent, we still return the object (never a bare array) and apply a safety
 * cap of 50 rows instead of loading the unbounded history.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    await sweepOverdueKitchenOrders();

    const { cursor, limit } = parseOrderPageParams(request.nextUrl.searchParams);

    const rows = await db.order.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        kitchen: {
          select: {
            id: true,
            kitchenName: true,
            slug: true,
          },
        },
        review: {
          select: {
            id: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      ...buildOrderCursorArgs(cursor, limit),
    });

    const page = toCursorPage(rows, limit);
    return NextResponse.json(page);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الطلبات.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
