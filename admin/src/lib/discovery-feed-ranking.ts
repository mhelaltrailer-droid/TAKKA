import { DISCOVERY_TOP_DISHES } from "@/lib/discovery-cursor-pagination";

/** Minimal menu row used by top-dish ranking. */
export type DiscoveryMenuCandidate = {
  id: string;
  kitchenId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  basePrice: { toString(): string };
  isDishOfTheDay: boolean;
  dishOfTheDayPrice: { toString(): string } | null;
  dishOfTheDayQty: number | null;
  createdAt: Date;
};

export type DiscoveryFeedDish = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  basePrice: string;
  isDishOfTheDay: boolean;
};

export function isActiveDishOfTheDay(item: DiscoveryMenuCandidate): boolean {
  if (!item.isDishOfTheDay || item.dishOfTheDayPrice == null) {
    return false;
  }
  return item.dishOfTheDayQty == null || item.dishOfTheDayQty > 0;
}

export function toDiscoveryFeedDish(
  item: DiscoveryMenuCandidate,
): DiscoveryFeedDish {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    categoryId: item.categoryId,
    basePrice: item.basePrice.toString(),
    isDishOfTheDay: isActiveDishOfTheDay(item),
  };
}

/**
 * Pick top dishes: dish-of-the-day first, then most-ordered, then newest.
 */
export function pickTopDishes(
  items: DiscoveryMenuCandidate[],
  orderCountByMenuItemId: Map<string, number>,
  limit: number = DISCOVERY_TOP_DISHES,
): DiscoveryMenuCandidate[] {
  if (items.length === 0 || limit <= 0) {
    return [];
  }

  const remaining = [...items];
  const picked: DiscoveryMenuCandidate[] = [];

  const dotdIndex = remaining.findIndex(isActiveDishOfTheDay);
  if (dotdIndex >= 0) {
    picked.push(remaining.splice(dotdIndex, 1)[0]!);
  }

  remaining.sort((a, b) => {
    const countA = orderCountByMenuItemId.get(a.id) ?? 0;
    const countB = orderCountByMenuItemId.get(b.id) ?? 0;
    if (countB !== countA) {
      return countB - countA;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  for (const item of remaining) {
    if (picked.length >= limit) break;
    picked.push(item);
  }

  return picked;
}

export function textMatches(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
