import { db } from "@/lib/db";
import {
  summarizeKitchenOrders,
  type KitchenOrderAuditInput,
  type KitchenOrderTotals,
} from "@/lib/kitchen-performance";
import type { StatsDateRange } from "@/lib/kitchen-order-stats";

export type KitchenPerformanceRow = KitchenOrderTotals & {
  kitchenId: string;
  kitchenName: string;
  cityName: string;
  regionName: string;
  approvalStatus: string;
  availabilityStatus: string;
  suspensionLevel: "LEVEL_1" | "LEVEL_2" | null;
  ratingAverage: number | null;
  ratingCount: number;
  complaints: number;
};

function asAudit(order: {
  placedAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  kitchenRespondedAt: Date | null;
  kitchenResponse: "ACCEPTED" | "REJECTED" | null;
  cancelReason: string | null;
  status: string;
}): KitchenOrderAuditInput {
  return order;
}

export async function loadKitchenPerformance(range: StatsDateRange) {
  const [kitchens, orders, reviewGroups, issueGroups] = await Promise.all([
    db.kitchen.findMany({
      select: {
        id: true,
        kitchenName: true,
        approvalStatus: true,
        availabilityStatus: true,
        suspensionLevel: true,
        region: { select: { cityName: true, regionName: true } },
      },
      orderBy: { kitchenName: "asc" },
    }),
    db.order.findMany({
      where: { placedAt: { gte: range.from, lte: range.to } },
      select: {
        kitchenId: true,
        placedAt: true,
        acceptedAt: true,
        cancelledAt: true,
        kitchenRespondedAt: true,
        kitchenResponse: true,
        cancelReason: true,
        status: true,
      },
    }),
    db.review.groupBy({
      by: ["kitchenId"],
      where: {
        createdAt: { gte: range.from, lte: range.to },
        visibility: "VISIBLE",
      },
      _avg: { ratingValue: true },
      _count: { _all: true },
    }),
    db.orderIssue.groupBy({
      by: ["kitchenId"],
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    }),
  ]);

  const ordersByKitchen = new Map<string, KitchenOrderAuditInput[]>();
  for (const order of orders) {
    const list = ordersByKitchen.get(order.kitchenId) ?? [];
    list.push(asAudit(order));
    ordersByKitchen.set(order.kitchenId, list);
  }
  const ratings = new Map(
    reviewGroups.map((group) => [
      group.kitchenId,
      {
        average: group._avg.ratingValue,
        count: group._count._all,
      },
    ]),
  );
  const complaints = new Map(
    issueGroups.map((group) => [group.kitchenId, group._count._all]),
  );

  const rows: KitchenPerformanceRow[] = kitchens.map((kitchen) => {
    const summary = summarizeKitchenOrders(
      ordersByKitchen.get(kitchen.id) ?? [],
    );
    const rating = ratings.get(kitchen.id);
    return {
      ...summary,
      kitchenId: kitchen.id,
      kitchenName: kitchen.kitchenName,
      cityName: kitchen.region.cityName,
      regionName: kitchen.region.regionName,
      approvalStatus: kitchen.approvalStatus,
      availabilityStatus: kitchen.availabilityStatus,
      suspensionLevel: kitchen.suspensionLevel,
      ratingAverage: rating?.average ?? null,
      ratingCount: rating?.count ?? 0,
      complaints: complaints.get(kitchen.id) ?? 0,
    };
  });

  return rows;
}

export async function loadKitchenAudit(kitchenId: string, range: StatsDateRange) {
  const kitchen = await db.kitchen.findUnique({
    where: { id: kitchenId },
    select: {
      id: true,
      kitchenName: true,
      suspensionLevel: true,
      suspendedAt: true,
      region: { select: { cityName: true, regionName: true } },
    },
  });
  if (!kitchen) return null;

  const [orders, reviews, complaints, suspensions] = await Promise.all([
    db.order.findMany({
      where: {
        kitchenId,
        placedAt: { gte: range.from, lte: range.to },
      },
      select: {
        id: true,
        orderNumber: true,
        placedAt: true,
        acceptedAt: true,
        cancelledAt: true,
        kitchenRespondedAt: true,
        kitchenResponse: true,
        kitchenRejectReason: true,
        cancelReason: true,
        status: true,
      },
      orderBy: { placedAt: "desc" },
      take: 200,
    }),
    db.review.aggregate({
      where: {
        kitchenId,
        visibility: "VISIBLE",
        createdAt: { gte: range.from, lte: range.to },
      },
      _avg: { ratingValue: true },
      _count: { _all: true },
    }),
    db.orderIssue.count({
      where: {
        kitchenId,
        createdAt: { gte: range.from, lte: range.to },
      },
    }),
    db.kitchenSuspensionRecord.findMany({
      where: {
        kitchenId,
        startedAt: { lte: range.to },
        OR: [{ endedAt: null }, { endedAt: { gte: range.from } }],
      },
      include: {
        endedBy: { select: { fullName: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const summary = summarizeKitchenOrders(orders.map(asAudit));

  return {
    kitchen,
    summary,
    orders,
    ratingAverage: reviews._avg.ratingValue,
    ratingCount: reviews._count._all,
    complaints,
    suspensions,
  };
}
