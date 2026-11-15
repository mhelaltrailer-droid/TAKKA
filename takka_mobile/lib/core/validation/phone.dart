/// Shared with web (`admin/src/lib/phone.ts`).
/// Accepts 01XXXXXXXXX, +20 / 0020 / 20, and Arabic-Indic digits,
/// then returns the local 01XXXXXXXXX form when the number is Egyptian.
final RegExp _mobileRegex = RegExp(r'^01[0-9]{9}$');

String normalizePhone(String input) {
  final buffer = StringBuffer();
  for (final code in input.runes) {
    if (code >= 0x0660 && code <= 0x0669) {
      buffer.writeCharCode(0x30 + code - 0x0660);
    } else if (code >= 0x06F0 && code <= 0x06F9) {
      buffer.writeCharCode(0x30 + code - 0x06F0);
    } else {
      buffer.writeCharCode(code);
    }
  }

  var value = buffer
      .toString()
      .replaceAll(RegExp(r'[\s\-().\u200e\u200f\u202a-\u202e]'), '')
      .trim();
  if (value.startsWith('+')) {
    value = value.substring(1);
  }

  String? rest;
  if (value.startsWith('0020')) {
    rest = value.substring(4);
  } else if (value.startsWith('20')) {
    rest = value.substring(2);
  }

  if (rest != null) {
    if (RegExp(r'^01[0-9]{9}$').hasMatch(rest)) return rest;
    if (RegExp(r'^1[0-9]{9}$').hasMatch(rest)) return '0$rest';
  }
  return value;
}

bool isValidPhone(String input) {
  return _mobileRegex.hasMatch(normalizePhone(input));
}

String? phoneValidationMessage(String input) {
  final local = normalizePhone(input);

  if (local.isEmpty) {
    return 'رقم الهاتف مطلوب.';
  }

  if (!local.startsWith('01')) {
    return 'رقم الهاتف يجب أن يبدأ بـ 01.';
  }

  if (local.length != 11 || !_mobileRegex.hasMatch(local)) {
    return 'رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01.';
  }

  return null;
}
