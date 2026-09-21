import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// مدينة العبور — قيم افتراضية احتياطية إن تعذر الاتصال بالخادم.
const String obourCityName = 'مدينة العبور';

const List<String> defaultObourDistricts = [
  'الحي الأول',
  'الحي الثاني',
  'الحي الثالث',
  'الحي الرابع',
  'الحي الخامس',
  'الحي السادس',
  'الحي السابع',
  'الحي الثامن',
  'الحي التاسع',
  'الحي الترفيهي',
  'دار مصر',
  'الكرامة / سكن مصر',
  'الحرية / المجد',
  'إسكان الشباب / المستقبل',
  'الإسكان العائلي / القومي',
  'جولف سيتي',
  'جمعية عرابي',
];

/// Kept for older call sites; prefer [defaultObourDistricts] + API list.
const List<String> obourDistricts = defaultObourDistricts;

const Map<String, String> mergedDistrictAliases = {
  'إسكان الشباب': 'إسكان الشباب / المستقبل',
  'إسكان المستقبل': 'إسكان الشباب / المستقبل',
  'إسكان الشباب / المستقبل': 'إسكان الشباب / المستقبل',
  'الحرية': 'الحرية / المجد',
  'حي المجد': 'الحرية / المجد',
  'الحرية / حي المجد': 'الحرية / المجد',
  'الحرية / المجد': 'الحرية / المجد',
  'الإسكان العائلي': 'الإسكان العائلي / القومي',
  'الإسكان القومي': 'الإسكان العائلي / القومي',
  'الإسكان العائلي / القومي': 'الإسكان العائلي / القومي',
  'سكن مصر (العبور الجديدة)': 'الكرامة / سكن مصر',
  'حي الكرامة': 'الكرامة / سكن مصر',
  'الكرامة / سكن مصر': 'الكرامة / سكن مصر',
};

Future<List<String>> loadObourDistricts() async {
  try {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;
    final response = await http.get(Uri.parse('$base/api/discovery/districts'));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return defaultObourDistricts;
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final districts = (json['districts'] as List<dynamic>? ?? const [])
        .map((item) => (item as Map<String, dynamic>)['regionName']?.toString() ?? '')
        .where((name) => name.isNotEmpty)
        .toList();

    return districts.isEmpty ? defaultObourDistricts : districts;
  } catch (_) {
    return defaultObourDistricts;
  }
}

bool isObourDistrict(String value, {List<String>? allowed}) {
  final list = allowed ?? defaultObourDistricts;
  final normalized = normalizeMergedDistrict(value.trim());
  return list.contains(normalized);
}

String normalizeMergedDistrict(String regionName) {
  return mergedDistrictAliases[regionName] ?? regionName;
}

String? assertObourLocation(
  String cityName,
  String regionName, {
  List<String>? allowedDistricts,
}) {
  if (cityName.trim() != obourCityName) {
    return 'المدينة يجب أن تكون $obourCityName.';
  }
  if (!isObourDistrict(regionName, allowed: allowedDistricts)) {
    return 'اختر حيًا من أحياء مدينة العبور.';
  }
  return null;
}
