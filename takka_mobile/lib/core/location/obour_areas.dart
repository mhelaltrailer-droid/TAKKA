import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'obour_geofence.dart';

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

String _apiBase() {
  final base = AppConfig.apiBaseUrl.endsWith('/')
      ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
      : AppConfig.apiBaseUrl;
  return base;
}

List<LngLat>? _parseRing(dynamic raw) {
  if (raw is! List || raw.length < 4) return null;
  final points = <LngLat>[];
  for (final item in raw) {
    if (item is! List || item.length < 2) return null;
    final lng = (item[0] as num?)?.toDouble();
    final lat = (item[1] as num?)?.toDouble();
    if (lng == null || lat == null) return null;
    points.add((lng: lng, lat: lat));
  }
  return points.length >= 4 ? points : null;
}

void _applyGeofenceFromPayload(Map<String, dynamic> json) {
  final cityRing = _parseRing(json['cityRing']);
  final districtsRaw = json['districts'] as List<dynamic>? ?? const [];
  final polygons = <ObourDistrictPolygon>[];

  for (final item in districtsRaw) {
    if (item is! Map<String, dynamic>) continue;
    final name = item['regionName']?.toString().trim() ?? '';
    if (name.isEmpty) continue;
    final ring = _parseRing(item['polygonRing']);
    if (ring == null) continue;
    polygons.add(ObourDistrictPolygon(name: name, ring: ring));
  }

  setRuntimeObourGeofence(
    districts: polygons.isEmpty ? null : polygons,
    cityRing: cityRing,
  );
}

Future<List<String>> loadObourDistricts() async {
  try {
    final response = await http.get(Uri.parse('${_apiBase()}/api/discovery/districts'));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return defaultObourDistricts;
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    _applyGeofenceFromPayload(json);

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
