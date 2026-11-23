/** Default page size for lean discovery feed. */
export const DEFAULT_DISCOVERY_PAGE_LIMIT = 20;

/** Hard ceiling for any requested `limit`. */
export const MAX_DISCOVERY_PAGE_LIMIT = 50;

/** Top dishes shown on each home card. */
export const DISCOVERY_TOP_DISHES = 3;

export const DISCOVERY_CURSOR_ORDER_BY = [
  { averageRating: "desc" as const },
  { createdAt: "desc" as const },
  { id: "desc" as const },
];

export type DiscoveryPageParams = {
  cursor: string | undefined;
  limit: number;
};

export function parseDiscoveryPageParams(
  searchParams: URLSearchParams,
): DiscoveryPageParams {
  const rawCursor = searchParams.get("cursor")?.trim();
  const cursor = rawCursor ? rawCursor : undefined;

  let limit = DEFAULT_DISCOVERY_PAGE_LIMIT;
  if (searchParams.has("limit")) {
    const parsed = Number.parseInt(searchParams.get("limit") ?? "", 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_DISCOVERY_PAGE_LIMIT);
    }
  }

  return { cursor, limit };
}

export function buildDiscoveryCursorArgs(
  cursor: string | undefined,
  limit: number,
) {
  return {
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy: DISCOVERY_CURSOR_ORDER_BY,
  };
}

export type DiscoveryCursorPage<T extends { id: string }> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Given `take: limit + 1` rows, keep at most `limit` and derive nextCursor/hasMore.
 */
export function toDiscoveryCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): DiscoveryCursorPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
  return { items, nextCursor, hasMore };
}
