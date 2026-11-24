// Pure helpers for delivery-header street labels (no platform I/O).

/// Plus Code / Open Location Code fragment, e.g. `7FG8+2X` or `8FW4V75V+8F`.
final _plusCodePattern = RegExp(
  r'\b[A-Z0-9]{2,}\+[A-Z0-9]{2,}\b',
  caseSensitive: false,
);

/// Leading or trailing house / unit numbers (Latin + Arabic-Indic digits).
final _leadingHouseNumber = RegExp(
  r'^[\d\u0660-\u0669]+[A-Za-z\u0621-\u064A]?\s*[,،\-]?\s*',
);
final _trailingHouseNumber = RegExp(
  r'\s*[,،\-]?\s*[\d\u0660-\u0669]+[A-Za-z\u0621-\u064A]?$',
);

bool _isUnnamedRoad(String value) {
  final lower = value.toLowerCase();
  if (lower.contains('unnamed')) return true;
  if (value.contains('بدون اسم')) return true;
  if (value.contains('غير مسمى')) return true;
  if (value.contains('غير مسمّى')) return true;
  return false;
}

/// Strip house numbers, Plus Codes, and unnamed-road placeholders.
///
/// Returns `null` when nothing useful remains.
String? cleanStreetName(String? raw) {
  if (raw == null) return null;
  var s = raw.trim();
  if (s.isEmpty) return null;
  if (_isUnnamedRoad(s)) return null;

  s = s.replaceAll(_plusCodePattern, ' ').trim();
  s = s.replaceFirst(_leadingHouseNumber, '');
  s = s.replaceFirst(_trailingHouseNumber, '');
  s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
  s = s.replaceAll(RegExp(r'^[,،\-\s]+|[,،\-\s]+$'), '').trim();

  if (s.isEmpty || s.length < 2) return null;
  if (_isUnnamedRoad(s)) return null;
  return s;
}

/// Prefer [street], then [thoroughfare], after cleanup.
String? streetFromPlacemarkFields({
  String? street,
  String? thoroughfare,
}) {
  return cleanStreetName(street) ?? cleanStreetName(thoroughfare);
}

/// Header title: `street (district)` when street is available, else district only.
String formatDeliveryLocationTitle({
  required String district,
  String? street,
}) {
  final cleaned = cleanStreetName(street);
  if (cleaned == null || cleaned.isEmpty) return district;
  return '$cleaned ($district)';
}
