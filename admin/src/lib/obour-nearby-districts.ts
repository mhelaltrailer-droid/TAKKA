/**
 * جوار أحياء مدينة العبور — من خريطة المدينة + قواعد المنتج.
 * يُستخدم عند فراغ الحي المختار لعرض مطابخ من أحياء قريبة.
 */

/** أسماء قديمة أو بديلة تُطبَّع لاسم الكتالوج الحالي */
export const DISTRICT_CANONICAL_ALIASES: Record<string, string> = {
  "إسكان الشباب": "إسكان الشباب / المستقبل",
  "إسكان المستقبل": "إسكان الشباب / المستقبل",
  "الحرية": "الحرية / المجد",
  "حي المجد": "الحرية / المجد",
  "الحرية / حي المجد": "الحرية / المجد",
  "الإسكان العائلي": "الإسكان العائلي / القومي",
  "الإسكان القومي": "الإسكان العائلي / القومي",
  "سكن مصر (العبور الجديدة)": "الكرامة / سكن مصر",
  "حي الكرامة": "الكرامة / سكن مصر",
};

/** كتلة العبور الجديدة */
export const NEW_OBOUR_CLUSTER = [
  "الكرامة / سكن مصر",
  "الحرية / المجد",
] as const;

const NEW_OBOUR_NEIGHBORS = [
  ...NEW_OBOUR_CLUSTER,
  "الحي الثامن",
  "الحي الثالث",
  "إسكان الشباب / المستقبل",
  "الإسكان العائلي / القومي",
] as const;

/**
 * أحياء مجاورة لكل حي (بعد التطبيع عبر canonicalizeDistrict).
 * لا تُدرَج الأسماء البديلة هنا — تُحل عبر الـ aliases.
 */
export const NEARBY_DISTRICTS: Record<string, readonly string[]> = {
  "الكرامة / سكن مصر": NEW_OBOUR_NEIGHBORS.filter(
    (d) => d !== "الكرامة / سكن مصر",
  ),
  "الحرية / المجد": NEW_OBOUR_NEIGHBORS.filter((d) => d !== "الحرية / المجد"),

  "الحي الثامن": [
    "إسكان الشباب / المستقبل",
    "الإسكان العائلي / القومي",
    "الحي الثاني",
    "الحي الثالث",
    ...NEW_OBOUR_CLUSTER,
  ],
  "إسكان الشباب / المستقبل": [
    "الحي الثامن",
    "الإسكان العائلي / القومي",
    "الحي الثاني",
    ...NEW_OBOUR_CLUSTER,
  ],
  "الإسكان العائلي / القومي": [
    "الحي الثامن",
    "إسكان الشباب / المستقبل",
    "الحي الثالث",
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
  "الحي الثاني": [
    "الحي الأول",
    "الحي الثامن",
    "الحي الثالث",
    "إسكان الشباب / المستقبل",
  ],
  "الحي الثالث": [
    "الحي الثاني",
    "الحي الرابع",
    "الحي الثامن",
    "الإسكان العائلي / القومي",
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
