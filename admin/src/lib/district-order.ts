import { OBOUR_DISTRICTS } from "./obour-areas";

const DISTRICT_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
] as const;

/**
 * Natural district order: الحي الأول…التاسع, then the seeded catalog,
 * then any other name. "حي آخر" stays last (it is also a form option).
 */
export function districtSortOrder(regionName: string): number {
  const name = regionName.trim();
  const ordinalIndex = DISTRICT_ORDINALS.findIndex(
    (word) => name === `الحي ${word}`,
  );
  if (ordinalIndex >= 0) return ordinalIndex + 1;

  if (
    name === "حي آخر" ||
    name.startsWith("حي آخر —") ||
    name.startsWith("حي آخر -")
  ) {
    return 10_000;
  }

  const catalogIndex = (OBOUR_DISTRICTS as readonly string[]).indexOf(name);
  if (catalogIndex >= 0) return 100 + catalogIndex;

  return 1_000;
}

export function compareDistrictNames(a: string, b: string): number {
  const diff = districtSortOrder(a) - districtSortOrder(b);
  if (diff !== 0) return diff;
  return a.localeCompare(b, "ar");
}

export function sortDistrictRows<
  T extends { sortOrder: number; regionName: string },
>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return compareDistrictNames(a.regionName, b.regionName);
  });
}
