/// جوار أحياء مدينة العبور — من خريطة المدينة + قواعد المنتج.
/// يُستخدم عند فراغ الحي المختار لعرض مطابخ من أحياء قريبة.

/// أسماء قديمة أو بديلة تُطبَّع لاسم الكتالوج الحالي
const Map<String, String> districtCanonicalAliases = {
  'إسكان الشباب': 'إسكان الشباب / المستقبل',
  'إسكان المستقبل': 'إسكان الشباب / المستقبل',
  'الحرية': 'الحرية / المجد',
  'حي المجد': 'الحرية / المجد',
  'الحرية / حي المجد': 'الحرية / المجد',
  'الإسكان العائلي': 'الإسكان العائلي / القومي',
  'الإسكان القومي': 'الإسكان العائلي / القومي',
  'سكن مصر (العبور الجديدة)': 'الكرامة / سكن مصر',
  'حي الكرامة': 'الكرامة / سكن مصر',
};

/// كتلة العبور الجديدة
const List<String> newObourCluster = [
  'الكرامة / سكن مصر',
  'الحرية / المجد',
];

/// أحياء مجاورة لكل حي (بعد التطبيع عبر [canonicalizeDistrict]).
const Map<String, List<String>> nearbyDistricts = {
  'الكرامة / سكن مصر': [
    'الحرية / المجد',
    'الحي الثامن',
    'الحي الثالث',
    'إسكان الشباب / المستقبل',
    'الإسكان العائلي / القومي',
  ],
  'الحرية / المجد': [
    'الكرامة / سكن مصر',
    'الحي الثامن',
    'الحي الثالث',
    'إسكان الشباب / المستقبل',
    'الإسكان العائلي / القومي',
  ],
  'الحي الثامن': [
    'إسكان الشباب / المستقبل',
    'الإسكان العائلي / القومي',
    'الحي الثاني',
    'الحي الثالث',
    ...newObourCluster,
  ],
  'إسكان الشباب / المستقبل': [
    'الحي الثامن',
    'الإسكان العائلي / القومي',
    'الحي الثاني',
    ...newObourCluster,
  ],
  'الإسكان العائلي / القومي': [
    'الحي الثامن',
    'إسكان الشباب / المستقبل',
    'الحي الثالث',
    ...newObourCluster,
  ],
  'جمعية عرابي': [
    'الحي الخامس',
    'الحي السادس',
    'الحي السابع',
    'جولف سيتي',
  ],
  'جولف سيتي': ['جمعية عرابي', 'الحي السابع', 'الحي السادس'],
  'دار مصر': ['الحي الترفيهي', 'الحي التاسع'],
  'الحي الترفيهي': ['دار مصر', 'الحي التاسع'],
  'الحي التاسع': ['دار مصر', 'الحي الترفيهي'],
  'الحي الأول': ['الحي الثاني', 'الحي الخامس'],
  'الحي الثاني': [
    'الحي الأول',
    'الحي الثامن',
    'الحي الثالث',
    'إسكان الشباب / المستقبل',
  ],
  'الحي الثالث': [
    'الحي الثاني',
    'الحي الرابع',
    'الحي الثامن',
    'الإسكان العائلي / القومي',
    ...newObourCluster,
  ],
  'الحي الرابع': ['الحي الثالث'],
  'الحي الخامس': ['الحي الأول', 'الحي السادس', 'جمعية عرابي'],
  'الحي السادس': [
    'الحي الخامس',
    'الحي السابع',
    'جمعية عرابي',
    'جولف سيتي',
  ],
  'الحي السابع': ['الحي السادس', 'جمعية عرابي', 'جولف سيتي'],
};

String canonicalizeDistrict(String regionName) {
  final trimmed = regionName.trim();
  return districtCanonicalAliases[trimmed] ?? trimmed;
}

List<String> districtNameVariants(String regionName) {
  final canonical = canonicalizeDistrict(regionName);
  final aliases = districtCanonicalAliases.entries
      .where((e) => e.value == canonical)
      .map((e) => e.key);
  return <String>{canonical, ...aliases, regionName.trim()}.toList();
}

bool districtsMatch(String a, String b) {
  return canonicalizeDistrict(a) == canonicalizeDistrict(b);
}

List<String> getNearbyDistrictNames(String regionName) {
  final canonical = canonicalizeDistrict(regionName);
  final neighbors = nearbyDistricts[canonical] ?? const <String>[];
  final expanded = <String>{};

  for (final neighbor in neighbors) {
    expanded.addAll(districtNameVariants(neighbor));
  }

  for (final self in districtNameVariants(regionName)) {
    expanded.remove(self);
  }

  return expanded.toList();
}

bool kitchenMatchesDistrict(String kitchenRegionName, String selectedDistrict) {
  return districtsMatch(kitchenRegionName, selectedDistrict);
}

bool kitchenMatchesAnyDistrict(
  String kitchenRegionName,
  List<String> districts,
) {
  return districts.any(
    (district) => districtsMatch(kitchenRegionName, district),
  );
}
