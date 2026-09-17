import { OrderStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type StatsDateRange = {
  from: Date;
  to: Date;
  fromKey: string;
  toKey: string;
};

export type OrderStatsSummary = {
  totalOrders: number;
  completed: number;
  cancelledTotal: number;
  cancelledByCustomer: number;
  rejectedByKitchen: number;
  inProgress: number;
  /** Sum of totalAmount for COMPLETED orders only. */
  salesCompleted: number;
  completionRate: number;
  /** Kitchen page views (deduped per session/day at write time). */
  viewsTotal: number;
  /** Distinct session keys that viewed in range. */
  uniqueVisitors: number;
  /** totalOrders / uniqueVisitors * 100 (0 if no visitors). */
  conversionRate: number;
};

export type KitchenOrderStatsRow = OrderStatsSummary & {
  kitchenId: string;
  kitchenName: string;
  regionName: string;
  cityName: string;
  approvalStatus: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDayStart(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function parseDayEnd(key: string): Date | null {
  const start = parseDayStart(key);
  if (!start) return null;
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    23,
    59,
    59,
    999,
  );
}

/** Default: last 30 calendar days inclusive (today and 29 days before). */
export function resolveStatsDateRange(input?: {
  from?: string | null;
  to?: string | null;
}): StatsDateRange {
  const today = new Date();
  const defaultToKey = formatDateKey(today);
  const defaultFrom = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 29,
    0,
    0,
    0,
    0,
  );
  const defaultFromKey = formatDateKey(defaultFrom);

  let fromKey = input?.from?.trim() || defaultFromKey;
  let toKey = input?.to?.trim() || defaultToKey;

  let from = parseDayStart(fromKey) ?? parseDayStart(defaultFromKey)!;
  let to = parseDayEnd(toKey) ?? parseDayEnd(defaultToKey)!;

  if (from.getTime() > to.getTime()) {
    const swapFrom = fromKey;
    fromKey = toKey;
    toKey = swapFrom;
    from = parseDayStart(fromKey)!;
    to = parseDayEnd(toKey)!;
  }

  return { from, to, fromKey, toKey };
}

const CUSTOMER_CANCEL_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED_BEFORE_DEPOSIT,
  OrderStatus.CANCELLED_AFTER_DEPOSIT,
];

function emptySummary(): OrderStatsSummary {
  return {
    totalOrders: 0,
    completed: 0,
    cancelledTotal: 0,
    cancelledByCustomer: 0,
    rejectedByKitchen: 0,
    inProgress: 0,
    salesCompleted: 0,
    completionRate: 0,
    viewsTotal: 0,
    uniqueVisitors: 0,
    conversionRate: 0,
  };
}

function accumulate(
  summary: OrderStatsSummary,
  status: OrderStatus,
  totalAmount: Prisma.Decimal | number,
) {
  summary.totalOrders += 1;
  if (status === OrderStatus.COMPLETED) {
    summary.completed += 1;
    summary.salesCompleted += Number(totalAmount);
  } else if (CUSTOMER_CANCEL_STATUSES.includes(status)) {
    summary.cancelledByCustomer += 1;
    summary.cancelledTotal += 1;
  } else if (status === OrderStatus.REJECTED_BY_KITCHEN) {
    summary.rejectedByKitchen += 1;
    summary.cancelledTotal += 1;
  } else {
    summary.inProgress += 1;
  }
}

function finalize(summary: OrderStatsSummary): OrderStatsSummary {
  summary.completionRate =
    summary.totalOrders > 0
      ? Math.round((summary.completed / summary.totalOrders) * 1000) / 10
      : 0;
  summary.salesCompleted =
    Math.round(summary.salesCompleted * 100) / 100;
  summary.conversionRate =
    summary.uniqueVisitors > 0
      ? Math.round((summary.totalOrders / summary.uniqueVisitors) * 1000) / 10
      : 0;
  return summary;
}

async function attachViewStats(
  summary: OrderStatsSummary,
  range: StatsDateRange,
  kitchenId?: string,
): Promise<OrderStatsSummary> {
  const where = {
    createdAt: { gte: range.from, lte: range.to },
    ...(kitchenId ? { kitchenId } : {}),
  };

  const [viewsTotal, distinctSessions] = await Promise.all([
    db.kitchenViewEvent.count({ where }),
    db.kitchenViewEvent.findMany({
      where,
      distinct: ["sessionKey"],
      select: { sessionKey: true },
    }),
  ]);

  summary.viewsTotal = viewsTotal;
  summary.uniqueVisitors = distinctSessions.length;
  return finalize(summary);
}

export async function getOrderStatsSummary(params: {
  range: StatsDateRange;
  kitchenId?: string;
}): Promise<OrderStatsSummary> {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: params.range.from, lte: params.range.to },
      ...(params.kitchenId ? { kitchenId: params.kitchenId } : {}),
    },
    select: { status: true, totalAmount: true },
  });

  const summary = emptySummary();
  for (const order of orders) {
    accumulate(summary, order.status, order.totalAmount);
  }
  return attachViewStats(summary, params.range, params.kitchenId);
}

export async function getAllKitchensOrderStats(
  range: StatsDateRange,
): Promise<KitchenOrderStatsRow[]> {
  const [kitchens, orders, views] = await Promise.all([
    db.kitchen.findMany({
      select: {
        id: true,
        kitchenName: true,
        approvalStatus: true,
        region: { select: { regionName: true, cityName: true } },
      },
      orderBy: { kitchenName: "asc" },
    }),
    db.order.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
      },
      select: {
        kitchenId: true,
        status: true,
        totalAmount: true,
      },
    }),
    db.kitchenViewEvent.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
      },
      select: {
        kitchenId: true,
        sessionKey: true,
      },
    }),
  ]);

  const byKitchen = new Map<string, OrderStatsSummary>();
  const sessionsByKitchen = new Map<string, Set<string>>();

  for (const kitchen of kitchens) {
    byKitchen.set(kitchen.id, emptySummary());
    sessionsByKitchen.set(kitchen.id, new Set());
  }

  for (const order of orders) {
    let bucket = byKitchen.get(order.kitchenId);
    if (!bucket) {
      bucket = emptySummary();
      byKitchen.set(order.kitchenId, bucket);
      sessionsByKitchen.set(order.kitchenId, new Set());
    }
    accumulate(bucket, order.status, order.totalAmount);
  }

  for (const view of views) {
    let bucket = byKitchen.get(view.kitchenId);
    if (!bucket) {
      bucket = emptySummary();
      byKitchen.set(view.kitchenId, bucket);
      sessionsByKitchen.set(view.kitchenId, new Set());
    }
    bucket.viewsTotal += 1;
    sessionsByKitchen.get(view.kitchenId)!.add(view.sessionKey);
  }

  return kitchens.map((kitchen) => {
    const stats = byKitchen.get(kitchen.id) ?? emptySummary();
    stats.uniqueVisitors = sessionsByKitchen.get(kitchen.id)?.size ?? 0;
    const finalized = finalize(stats);
    return {
      kitchenId: kitchen.id,
      kitchenName: kitchen.kitchenName,
      regionName: kitchen.region.regionName,
      cityName: kitchen.region.cityName,
      approvalStatus: kitchen.approvalStatus,
      ...finalized,
    };
  });
}

export function formatMoneyEg(value: number) {
  return `${value.toFixed(0)} ج.م`;
}
