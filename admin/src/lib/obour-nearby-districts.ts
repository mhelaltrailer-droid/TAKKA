/**
 * جوار أحياء مدينة العبور — من خريطة المدينة + قواعد المنتج.
 * يُستخدم عند فراغ الحي المختار لعرض مطابخ من أحياء قريبة.
 */

/** أسماء تُعامل كأنها الحي الثامن */
export const DISTRICT_CANONICAL_ALIASES: Record<string, string> = {
  "الإسكان العائلي": "الحي الثامن",
  "الإسكان القومي": "الحي الثامن",
  "إسكان المستقبل": "الحي الثامن",
};

/** كتلة العبور الجديدة */
export const NEW_OBOUR_CLUSTER = [
  "سكن مصر (العبور الجديدة)",
  "الحرية",
  "حي الكرامة",
  "حي المجد",
] as const;

const NEW_OBOUR_NEIGHBORS = [
  ...NEW_OBOUR_CLUSTER,
  "الحي الثامن",
  "الحي الثالث",
  "إسكان الشباب",
] as const;

/**
 * أحياء مجاورة لكل حي (بعد التطبيع عبر canonicalizeDistrict).
 * لا تُدرَج الأسماء البديلة للثامن هنا — تُحل عبر الـ aliases.
 */
export const NEARBY_DISTRICTS: Record<string, readonly string[]> = {
  "سكن مصر (العبور الجديدة)": NEW_OBOUR_NEIGHBORS.filter(
    (d) => d !== "سكن مصر (العبور الجديدة)",
  ),
  "الحرية": NEW_OBOUR_NEIGHBORS.filter((d) => d !== "الحرية"),
  "حي الكرامة": NEW_OBOUR_NEIGHBORS.filter((d) => d !== "حي الكرامة"),
  "حي المجد": NEW_OBOUR_NEIGHBORS.filter((d) => d !== "حي المجد"),

  "الحي الثامن": [
    "إسكان الشباب",
    "الحي الثاني",
    "الحي الثالث",
    ...NEW_OBOUR_CLUSTER,
  ],
  "إسكان الشباب": [
    "الحي الثامن",
    "الحي الثاني",
    ...NEW_OBOUR_CLUSTER,
  ],

  "جمعية عرابي": [
    "الحي الخامس",
    "الحي السادس",
    "الحي السابع",
    "جولف سيتي",
  ],
  "جولف سيتي": ["جمعية عرابي", "الحي السابع", "الحي السادس"],

  "دار مصر": ["الحي الترفيهي", "الحي التاسع"],
  "الحي الترفيهي": ["دار مصر", "الحي التاسع"],
  "الحي التاسع": ["دار مصر", "الحي الترفيهي"],

  "الحي الأول": ["الحي الثاني", "الحي الخامس"],
  "الحي الثاني": ["الحي الأول", "الحي الثامن", "الحي الثالث", "إسكان الشباب"],
  "الحي الثالث": [
    "الحي الثاني",
    "الحي الرابع",
    "الحي الثامن",
    ...NEW_OBOUR_CLUSTER,
  ],
  "الحي الرابع": ["الحي الثالث"],
  "الحي الخامس": ["الحي الأول", "الحي السادس", "جمعية عرابي"],
  "الحي السادس": [
    "الحي الخامس",
    "الحي السابع",
    "جمعية عرابي",
    "جولف سيتي",
  ],
  "الحي السابع": ["الحي السادس", "جمعية عرابي", "جولف سيتي"],
};

export function canonicalizeDistrict(regionName: string): string {
  const trimmed = regionName.trim();
  return DISTRICT_CANONICAL_ALIASES[trimmed] ?? trimmed;
}

/** كل الأسماء التي تُمثّل نفس الحي (بما فيها الاسم نفسه والبدائل). */
export function districtNameVariants(regionName: string): string[] {
  const canonical = canonicalizeDistrict(regionName);
  const aliases = Object.entries(DISTRICT_CANONICAL_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([alias]) => alias);
  return Array.from(new Set([canonical, ...aliases, regionName.trim()]));
}

export function districtsMatch(a: string, b: string): boolean {
  return canonicalizeDistrict(a) === canonicalizeDistrict(b);
}

/** أحياء مجاورة (أسماء كتالوج) بدون الحي المختار نفسه. */
export function getNearbyDistrictNames(regionName: string): string[] {
  const canonical = canonicalizeDistrict(regionName);
  const neighbors = NEARBY_DISTRICTS[canonical] ?? [];
  const expanded = new Set<string>();

  for (const neighbor of neighbors) {
    for (const variant of districtNameVariants(neighbor)) {
      expanded.add(variant);
    }
  }

  for (const self of districtNameVariants(regionName)) {
    expanded.delete(self);
  }

  return Array.from(expanded);
}

export function kitchenMatchesDistrict(
  kitchenRegionName: string,
  selectedDistrict: string,
): boolean {
  return districtsMatch(kitchenRegionName, selectedDistrict);
}

export function kitchenMatchesAnyDistrict(
  kitchenRegionName: string,
  districts: string[],
): boolean {
  return districts.some((district) =>
    districtsMatch(kitchenRegionName, district),
  );
}
