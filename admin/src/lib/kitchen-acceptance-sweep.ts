import { NotificationType, OrderStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { suspendKitchenForNoResponse } from "@/lib/kitchen-suspension";
import { getKitchenOrderPolicy } from "@/lib/kitchen-order-policy";
import {
  KITCHEN_NO_RESPONSE_REASON,
  acceptanceCutoff,
  rollingWindowStart,
} from "@/lib/kitchen-order-rules";
import { createNotification } from "@/lib/notifications";
import { triggerOrderEvent } from "@/lib/pusher";

const BATCH_LIMIT = 40;

export type SweepResult = {
  cancelled: number;
  suspended: number;
  failed: boolean;
};

let inFlight: Promise<SweepResult> | null = null;

/**
 * Cancels orders still waiting on the kitchen after the saved acceptance
 * timeout, then suspends a kitchen that crossed either rolling no-response
 * window. Safe to call often: each order is claimed with a conditional
 * update, and overlapping calls share one in-process run.
 *
 * On Render this is driven by the existing UptimeRobot ping of /api/health
 * (about every 5 minutes, which also keeps the free web service awake) and
 * by lazy calls from order and kitchen reads. No separate worker is required.
 * Busy status does not expire here.
 */
export function sweepOverdueKitchenOrders(now = new Date()) {
  if (inFlight) {
    return inFlight;
  }

  inFlight = runSweep(now)
    .catch(() => {
      console.error("[kitchen-acceptance] sweep failed");
      return { cancelled: 0, suspended: 0, failed: true };
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function runSweep(now: Date): Promise<SweepResult> {
  const policy = await getKitchenOrderPolicy();
  const cutoff = acceptanceCutoff(now, policy.acceptanceTimeoutMinutes);
  const candidates = await db.order.findMany({
    where: {
      status: OrderStatus.PENDING_KITCHEN_APPROVAL,
      placedAt: { lte: cutoff },
    },
    select: {
      id: true,
      customerId: true,
      kitchenId: true,
    },
    orderBy: { placedAt: "asc" },
    take: BATCH_LIMIT,
  });

  let cancelled = 0;
  const kitchens = new Set<string>();

  for (const order of candidates) {
    const updated = await db.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.PENDING_KITCHEN_APPROVAL,
      },
      data: {
        status: OrderStatus.CANCELLED_BEFORE_DEPOSIT,
        cancelReason: KITCHEN_NO_RESPONSE_REASON,
        cancelCustomerMessage: policy.customerNoResponseMessage,
        cancelledAt: now,
        cancelledBy: null,
      },
    });
    if (updated.count !== 1) {
      continue;
    }

    cancelled += 1;
    kitchens.add(order.kitchenId);

    try {
      await createNotification({
        userId: order.customerId,
        orderId: order.id,
        type: NotificationType.ORDER,
        title: "تم إلغاء الطلب",
        body: policy.customerNoResponseMessage,
      });
    } catch {
      console.error("[kitchen-acceptance] customer notification failed");
    }

    try {
      await triggerOrderEvent(order.id, "status:changed", {
        orderId: order.id,
        status: OrderStatus.CANCELLED_BEFORE_DEPOSIT,
        cancelReason: KITCHEN_NO_RESPONSE_REASON,
      });
    } catch {
      console.error("[kitchen-acceptance] order event failed");
    }
  }

  let suspended = 0;
  for (const kitchenId of kitchens) {
    try {
      const didSuspend = await suspendKitchenForNoResponse({
        kitchenId,
        now,
        policy,
      });
      if (didSuspend) {
        suspended += 1;
      }
    } catch {
      console.error("[kitchen-acceptance] suspension check failed");
    }
  }

  return { cancelled, suspended, failed: false };
}

export async function countNoResponseByKitchen(input: {
  since: Date;
  kitchenIds: string[];
}) {
  const counts = new Map<string, number>();
  if (!input.kitchenIds.length) {
    return counts;
  }

  const groups = await db.order.groupBy({
    by: ["kitchenId"],
    where: {
      kitchenId: { in: input.kitchenIds },
      cancelReason: KITCHEN_NO_RESPONSE_REASON,
      cancelledAt: { gte: input.since },
    },
    _count: { _all: true },
  });

  for (const group of groups) {
    counts.set(group.kitchenId, group._count._all);
  }
  return counts;
}

export async function noResponseWindows(now = new Date()) {
  const policy = await getKitchenOrderPolicy();
  return {
    policy,
    shortSince: rollingWindowStart(now, policy.shortWindowHours, "hours"),
    longSince: rollingWindowStart(now, policy.longWindowDays, "days"),
  };
}
