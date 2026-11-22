import { KitchenResponseKind } from "@prisma/client";

import { db } from "@/lib/db";
import { KITCHEN_REJECT_REASON_UNSPECIFIED } from "@/lib/kitchen-order-rules";

export function normalizeRejectReason(reason: string | null | undefined) {
  const trimmed = reason?.trim() ?? "";
  if (!trimmed) return KITCHEN_REJECT_REASON_UNSPECIFIED;
  return trimmed.slice(0, 500);
}

/** Writes the kitchen decision once. Later status changes do not clear it. */
export async function recordKitchenAcceptance(orderId: string, at: Date) {
  await db.order.updateMany({
    where: { id: orderId, kitchenRespondedAt: null },
    data: {
      kitchenRespondedAt: at,
      kitchenResponse: KitchenResponseKind.ACCEPTED,
    },
  });
}

export async function recordKitchenRejection(
  orderId: string,
  at: Date,
  reason: string | null | undefined,
) {
  await db.order.updateMany({
    where: { id: orderId, kitchenRespondedAt: null },
    data: {
      kitchenRespondedAt: at,
      kitchenResponse: KitchenResponseKind.REJECTED,
      kitchenRejectReason: normalizeRejectReason(reason),
    },
  });
}
