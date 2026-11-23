import { OrderStatus } from "@prisma/client";

/** Default page size when `limit` / `cursor` query params are used. */
export const DEFAULT_ORDER_PAGE_LIMIT = 20;

/** Hard ceiling for any requested `limit`. */
export const MAX_ORDER_PAGE_LIMIT = 50;

/**
 * Safety cap when the client omits both `cursor` and `limit`.
 * Old builds expected a full list under `{ orders }`; we still return that
 * key but cap rows so histories cannot grow unboundedly.
 */
export const LEGACY_ORDER_LIST_CAP = 50;

export const ORDER_CURSOR_ORDER_BY = [
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

/** Terminal / previous statuses — kitchen history is paginated over these only. */
export const PREVIOUS_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED_BEFORE_DEPOSIT,
  OrderStatus.CANCELLED_AFTER_DEPOSIT,
  OrderStatus.REJECTED_BY_KITCHEN,
];

export type OrderPageParams = {
  cursor: string | undefined;
  limit: number;
  /** True when the request opted into explicit pagination (`cursor` and/or `limit`). */
  explicit: boolean;
};

export function parseOrderPageParams(
  searchParams: URLSearchParams,
): OrderPageParams {
  const explicit =
    searchParams.has("cursor") || searchParams.has("limit");
  const rawCursor = searchParams.get("cursor")?.trim();
  const cursor = rawCursor ? rawCursor : undefined;

  let limit = explicit ? DEFAULT_ORDER_PAGE_LIMIT : LEGACY_ORDER_LIST_CAP;
  if (searchParams.has("limit")) {
    const parsed = Number.parseInt(searchParams.get("limit") ?? "", 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_ORDER_PAGE_LIMIT);
    }
  }

  return { cursor, limit, explicit };
}

export function buildOrderCursorArgs(cursor: string | undefined, limit: number) {
  return {
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy: ORDER_CURSOR_ORDER_BY,
  };
}

export type CursorPage<T extends { id: string }> = {
  orders: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Given `take: limit + 1` rows, keep at most `limit` and derive nextCursor/hasMore.
 */
export function toCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const orders = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (orders[orders.length - 1]?.id ?? null) : null;
  return { orders, nextCursor, hasMore };
}

/**
 * Merge active (always complete) with a history page.
 * Dedupes by id in case an order transitioned while paging.
 */
export function mergeActiveAndHistory<T extends { id: string }>(
  active: T[],
  historyPage: CursorPage<T>,
): CursorPage<T> {
  const seen = new Set<string>();
  const orders: T[] = [];
  for (const order of [...active, ...historyPage.orders]) {
    if (seen.has(order.id)) continue;
    seen.add(order.id);
    orders.push(order);
  }
  return {
    orders,
    nextCursor: historyPage.nextCursor,
    hasMore: historyPage.hasMore,
  };
}
