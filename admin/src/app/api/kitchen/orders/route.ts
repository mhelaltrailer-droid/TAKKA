import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sweepOverdueKitchenOrders } from "@/lib/kitchen-acceptance-sweep";
import {
  PREVIOUS_ORDER_STATUSES,
  buildOrderCursorArgs,
  mergeActiveAndHistory,
  parseOrderPageParams,
  toCursorPage,
} from "@/lib/order-cursor-pagination";

const kitchenOrderInclude = {
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
      submittedAt: "desc" as const,
    },
    take: 1,
  },
  items: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};

/**
 * Response shape: always `{ orders, nextCursor, hasMore }`.
 *
 * Backward compatibility: Flutter already reads `json['orders']`; new fields
 * are additive. Without `cursor`/`limit`, a safety cap of 50 applies to the
 * *history* slice (completed/cancelled/rejected).
 *
 * Kitchen safety: every non-terminal (active) order is always included on the
 * first page (no cursor), so the kitchen cannot miss a live order. `nextCursor`
 * / `hasMore` refer only to the previous-status history. Subsequent pages
 * (with `cursor`) return history only — clients append.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    await sweepOverdueKitchenOrders();

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

    const { cursor, limit } = parseOrderPageParams(request.nextUrl.searchParams);
    const historyArgs = buildOrderCursorArgs(cursor, limit);

    const historyRows = await db.order.findMany({
      where: {
        kitchenId: kitchen.id,
        status: { in: PREVIOUS_ORDER_STATUSES },
      },
      include: kitchenOrderInclude,
      ...historyArgs,
    });
    const historyPage = toCursorPage(historyRows, limit);

    // First page: prepend all active orders. Later pages: history only.
    if (!cursor) {
      const activeOrders = await db.order.findMany({
        where: {
          kitchenId: kitchen.id,
          status: { notIn: PREVIOUS_ORDER_STATUSES },
        },
        include: kitchenOrderInclude,
        orderBy: historyArgs.orderBy,
      });
      return NextResponse.json(mergeActiveAndHistory(activeOrders, historyPage));
    }

    return NextResponse.json(historyPage);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل طلبات المطبخ.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
