/// Shared with web (`admin/src/lib/phone.ts`): starts with 01, exactly 11 digits.
final RegExp _mobileRegex = RegExp(r'^01[0-9]{9}$');

String normalizePhone(String input) {
  return input.replaceAll(RegExp(r'[\s\-()]'), '').trim();
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
