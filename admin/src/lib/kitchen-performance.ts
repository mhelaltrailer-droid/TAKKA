import { KITCHEN_NO_RESPONSE_REASON } from "@/lib/kitchen-order-rules";

export type KitchenOrderAuditInput = {
  placedAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  kitchenRespondedAt: Date | null;
  kitchenResponse: "ACCEPTED" | "REJECTED" | null;
  cancelReason: string | null;
  status: string;
};

export type KitchenOrderClass =
  | "accepted"
  | "rejected"
  | "no_response"
  | "pending"
  | "other";

export type KitchenOrderTotals = {
  received: number;
  accepted: number;
  rejected: number;
  noResponse: number;
  pending: number;
  other: number;
  /** Accepted ÷ received. Null when nothing was received. */
  acceptanceRate: number | null;
  /** Mean minutes from placedAt to the durable kitchen response. */
  avgResponseMinutes: number | null;
};

/**
 * Prefers the durable kitchenResponse written at decision time.
 * Older rows that only have acceptedAt or REJECTED_BY_KITCHEN still count.
 */
export function classifyKitchenOrder(
  order: KitchenOrderAuditInput,
): KitchenOrderClass {
  if (
    order.kitchenResponse === "ACCEPTED" ||
    (order.kitchenResponse == null && order.acceptedAt != null)
  ) {
    return "accepted";
  }
  if (
    order.kitchenResponse === "REJECTED" ||
    order.status === "REJECTED_BY_KITCHEN"
  ) {
    return "rejected";
  }
  if (order.cancelReason === KITCHEN_NO_RESPONSE_REASON) {
    return "no_response";
  }
  if (order.status === "PENDING_KITCHEN_APPROVAL") {
    return "pending";
  }
  return "other";
}

export function responseMinutes(order: KitchenOrderAuditInput) {
  const kind = classifyKitchenOrder(order);
  const respondedAt =
    order.kitchenRespondedAt ??
    (kind === "accepted"
      ? order.acceptedAt
      : kind === "rejected"
        ? order.cancelledAt
        : null);
  if (!respondedAt) {
    return null;
  }
  const minutes = (respondedAt.getTime() - order.placedAt.getTime()) / 60_000;
  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }
  return minutes;
}

export function summarizeKitchenOrders(
  orders: KitchenOrderAuditInput[],
): KitchenOrderTotals {
  const totals = {
    received: orders.length,
    accepted: 0,
    rejected: 0,
    noResponse: 0,
    pending: 0,
    other: 0,
  };
  const samples: number[] = [];

  for (const order of orders) {
    const kind = classifyKitchenOrder(order);
    if (kind === "accepted") totals.accepted += 1;
    else if (kind === "rejected") totals.rejected += 1;
    else if (kind === "no_response") totals.noResponse += 1;
    else if (kind === "pending") totals.pending += 1;
    else totals.other += 1;

    if (kind === "accepted" || kind === "rejected") {
      const minutes = responseMinutes(order);
      if (minutes != null) samples.push(minutes);
    }
  }

  const avgResponseMinutes = samples.length
    ? samples.reduce((sum, value) => sum + value, 0) / samples.length
    : null;

  return {
    ...totals,
    acceptanceRate:
      totals.received === 0 ? null : totals.accepted / totals.received,
    avgResponseMinutes,
  };
}

export function formatPercent(rate: number | null) {
  if (rate == null) return "—";
  return `${Math.round(rate * 1000) / 10}%`;
}

export function formatMinutes(minutes: number | null) {
  if (minutes == null) return "—";
  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded} د`;
}
