import { ApprovalStatus, Prisma } from "@prisma/client";

import { getDiscoveryCacheSettings } from "@/lib/discovery-cache-settings-store";
import {
  buildDiscoveryCursorArgs,
  parseDiscoveryPageParams,
  toDiscoveryCursorPage,
  type DiscoveryCursorPage,
} from "@/lib/discovery-cursor-pagination";
import {
  pickTopDishes,
  textMatches,
  toDiscoveryFeedDish,
  type DiscoveryFeedDish,
  type DiscoveryMenuCandidate,
} from "@/lib/discovery-feed-ranking";
import { customerFacingAvailability } from "@/lib/kitchen-order-rules";
import { customerListedKitchenFilter } from "@/lib/kitchen-visibility";
import { db } from "@/lib/db";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";
import { TtlCache } from "@/lib/ttl-cache";

export type { DiscoveryFeedDish, DiscoveryMenuCandidate };
export { pickTopDishes } from "@/lib/discovery-feed-ranking";

export type DiscoveryFeedKitchen = {
  id: string;
  slug: string;
  kitchenName: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  cityName: string;
  averageRating: number;
  reviewsCount: number;
  availabilityStatus: "OPEN" | "BUSY" | "CLOSED";
  region: {
    id: string;
    regionName: string;
    cityName: string;
  } | null;
  menuItemsCount: number;
  menuItemNames: string[];
  menuItemCategoryIds: string[];
  topDishes: DiscoveryFeedDish[];
  /** Present when `q` matched dish name/description; may overlap topDishes. */
  matchingDishes: DiscoveryFeedDish[];
};

export type DiscoveryFeedQuery = {
  cityName: string;
  regionId?: string;
  regionName?: string;
  /** Comma-separated district names (OR). Used for adjacent-district cascade. */
  regionNames?: string[];
  category?: string;
  q?: string;
  cursor?: string;
  limit: number;
};

export type DiscoveryFeedResult = DiscoveryCursorPage<DiscoveryFeedKitchen>;

/**
 * Process-local feed cache. Search (`q`) is cached with the same admin TTL
 * when cache is enabled — debounce on the client keeps this cheap, and
 * checkout still re-validates availability so stale cards cannot cause
 * wrong orders.
 */
export const discoveryFeedCache = new TtlCache<DiscoveryFeedResult>(250);

export function clearDiscoveryFeedCache() {
  discoveryFeedCache.clear();
}

export function parseDiscoveryFeedQuery(
  searchParams: URLSearchParams,
): DiscoveryFeedQuery {
  const { cursor, limit } = parseDiscoveryPageParams(searchParams);
  const cityName = searchParams.get("cityName")?.trim() || OBOUR_CITY_NAME;
  const regionId = searchParams.get("regionId")?.trim() || undefined;
  const regionName = searchParams.get("regionName")?.trim() || undefined;
  const regionNamesRaw = searchParams.get("regionNames")?.trim() || "";
  const regionNames = regionNamesRaw
    ? regionNamesRaw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    : undefined;
  const category = searchParams.get("category")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  return {
    cityName,
    regionId: regionId || undefined,
    regionName: regionName || undefined,
    regionNames:
      regionNames && regionNames.length > 0 ? regionNames : undefined,
    category: category || undefined,
    q: q || undefined,
    cursor,
    limit,
  };
}

export function discoveryFeedCacheKey(query: DiscoveryFeedQuery): string {
  return JSON.stringify({
    cityName: query.cityName,
    regionId: query.regionId ?? "",
    regionName: query.regionName ?? "",
    regionNames: query.regionNames?.slice().sort().join(",") ?? "",
    category: query.category ?? "",
    q: query.q ?? "",
    cursor: query.cursor ?? "",
    limit: query.limit,
  });
}

const availableApprovedMenu: Prisma.MenuItemWhereInput = {
  isAvailable: true,
  approvalStatus: ApprovalStatus.APPROVED,
};

/** Exported for unit tests of filter composition. */
export function buildDiscoveryFeedWhere(
  query: DiscoveryFeedQuery,
): Prisma.KitchenWhereInput {
  const filters: Prisma.KitchenWhereInput[] = [customerListedKitchenFilter()];

  if (query.regionId) {
    filters.push({ regionId: query.regionId });
  } else if (query.regionNames && query.regionNames.length > 0) {
    filters.push({
      region: {
        cityName: query.cityName,
        regionName: { in: query.regionNames },
      },
    });
  } else if (query.regionName) {
    filters.push({
      region: {
        regionName: query.regionName,
        cityName: query.cityName,
      },
    });
  }

  if (query.category) {
    filters.push({
      menuItems: {
        some: {
          ...availableApprovedMenu,
          categoryId: query.category,
        },
      },
    });
  }

  if (query.q) {
    const q = query.q;
    filters.push({
      OR: [
        {
          kitchenName: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          menuItems: {
            some: {
              ...availableApprovedMenu,
              OR: [
                {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  description: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  return {
    approvalStatus: ApprovalStatus.APPROVED,
    cityName: query.cityName,
    AND: filters,
  };
}

async function loadOrderCounts(
  menuItemIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (menuItemIds.length === 0) {
    return map;
  }

  const grouped = await db.orderItem.groupBy({
    by: ["menuItemId"],
    where: { menuItemId: { in: menuItemIds } },
    _sum: { quantity: true },
  });

  for (const row of grouped) {
    map.set(row.menuItemId, row._sum.quantity ?? 0);
  }
  return map;
}

async function queryDiscoveryFeed(
  query: DiscoveryFeedQuery,
): Promise<DiscoveryFeedResult> {
  const where = buildDiscoveryFeedWhere(query);
  const cursorArgs = buildDiscoveryCursorArgs(query.cursor, query.limit);

  const kitchens = await db.kitchen.findMany({
    where,
    select: {
      id: true,
      slug: true,
      kitchenName: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      cityName: true,
      averageRating: true,
      reviewsCount: true,
      availabilityStatus: true,
      suspendedAt: true,
      createdAt: true,
      region: {
        select: {
          id: true,
          regionName: true,
          cityName: true,
        },
      },
      _count: {
        select: {
          menuItems: {
            where: availableApprovedMenu,
          },
        },
      },
    },
    ...cursorArgs,
  });

  const pageMeta = toDiscoveryCursorPage(kitchens, query.limit);
  const pageKitchens = pageMeta.items;

  if (pageKitchens.length === 0) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  const kitchenIds = pageKitchens.map((k) => k.id);

  const menuItems = await db.menuItem.findMany({
    where: {
      kitchenId: { in: kitchenIds },
      ...availableApprovedMenu,
    },
    select: {
      id: true,
      kitchenId: true,
      name: true,
      description: true,
      imageUrl: true,
      categoryId: true,
      basePrice: true,
      isDishOfTheDay: true,
      dishOfTheDayPrice: true,
      dishOfTheDayQty: true,
      createdAt: true,
    },
  });

  const orderCounts = await loadOrderCounts(menuItems.map((m) => m.id));

  const itemsByKitchen = new Map<string, DiscoveryMenuCandidate[]>();
  for (const item of menuItems) {
    const list = itemsByKitchen.get(item.kitchenId) ?? [];
    list.push(item);
    itemsByKitchen.set(item.kitchenId, list);
  }

  const needle = query.q?.trim() ?? "";

  const items: DiscoveryFeedKitchen[] = pageKitchens.map((kitchen) => {
    const allItems = itemsByKitchen.get(kitchen.id) ?? [];
    const top = pickTopDishes(allItems, orderCounts);
    const topDishes = top.map(toDiscoveryFeedDish);

    const matchingDishes =
      needle.length > 0
        ? allItems
            .filter(
              (item) =>
                textMatches(item.name, needle) ||
                textMatches(item.description, needle),
            )
            .slice(0, 8)
            .map(toDiscoveryFeedDish)
        : [];

    const categoryIds = [
      ...new Set(allItems.map((item) => item.categoryId).filter(Boolean)),
    ];

    return {
      id: kitchen.id,
      slug: kitchen.slug,
      kitchenName: kitchen.kitchenName,
      description: kitchen.description,
      logoUrl: kitchen.logoUrl,
      coverImageUrl: kitchen.coverImageUrl,
      cityName: kitchen.cityName,
      averageRating: kitchen.averageRating,
      reviewsCount: kitchen.reviewsCount,
      availabilityStatus: customerFacingAvailability(
        kitchen.availabilityStatus,
        kitchen.suspendedAt != null,
      ),
      region: kitchen.region,
      menuItemsCount: kitchen._count.menuItems,
      menuItemNames: topDishes.map((d) => d.name),
      menuItemCategoryIds: categoryIds,
      topDishes,
      matchingDishes,
    };
  });

  return {
    items,
    nextCursor: pageMeta.nextCursor,
    hasMore: pageMeta.hasMore,
  };
}

/**
 * Lean discovery feed with optional in-memory TTL cache.
 * Search results are cached with the same TTL when cacheEnabled is true.
 */
export async function getDiscoveryFeed(
  query: DiscoveryFeedQuery,
): Promise<DiscoveryFeedResult> {
  const settings = await getDiscoveryCacheSettings();
  const key = discoveryFeedCacheKey(query);

  if (settings.cacheEnabled) {
    const hit = discoveryFeedCache.get(key);
    if (hit) {
      return hit;
    }
  }

  const result = await queryDiscoveryFeed(query);

  if (settings.cacheEnabled) {
    discoveryFeedCache.set(key, result, settings.ttlSeconds * 1000);
  }

  return result;
}
