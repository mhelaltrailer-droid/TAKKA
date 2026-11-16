import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

const defaultSupportWhatsappNumber = '+201515327198';

const orderIssueOptions = <(String, String)>[
  ('COLD_FOOD', 'الأكل وصل بارد'),
  ('MISSING_ITEM', 'ناقص صنف'),
  ('LATE', 'اتأخر'),
  ('DEPOSIT', 'مشكلة في العربون'),
  ('OTHER', 'حاجة تانية'),
];

String? normalizeSupportWhatsappNumber(String raw) {
  var value = raw.trim().replaceAll(RegExp(r'[\s()-]'), '');
  if (value.isEmpty) return null;
  if (value.startsWith('00')) {
    value = '+${value.substring(2)}';
  }
  if (value.startsWith('+')) {
    final digits = value.substring(1);
    return RegExp(r'^\d{8,15}$').hasMatch(digits) ? '+$digits' : null;
  }
  if (value.startsWith('01') && value.length == 11) {
    return '+2$value';
  }
  if (RegExp(r'^\d{8,15}$').hasMatch(value)) {
    return '+$value';
  }
  return null;
}

String supportNumberFromAppVersionBody(String? body) {
  if (body == null || body.trim().isEmpty) {
    return defaultSupportWhatsappNumber;
  }
  try {
    final decoded = jsonDecode(body);
    if (decoded is! Map) return defaultSupportWhatsappNumber;
    final raw = decoded['supportWhatsappNumber'];
    if (raw is! String) return defaultSupportWhatsappNumber;
    return normalizeSupportWhatsappNumber(raw) ?? defaultSupportWhatsappNumber;
  } catch (_) {
    return defaultSupportWhatsappNumber;
  }
}

String buildOrderSupportMessage({
  required String orderNumber,
  required String kitchenName,
  required String problemLabel,
  String? note,
}) {
  final lines = <String>[
    'السلام عليكم، أنا عميل على تكة ومحتاج مساعدة.',
    'رقم الطلب: ${orderNumber.trim()}',
    'المطبخ: ${kitchenName.trim()}',
    'المشكلة: ${problemLabel.trim()}',
  ];
  final trimmed = note?.trim() ?? '';
  if (trimmed.isNotEmpty) {
    lines.add('تفاصيل: $trimmed');
  }
  return lines.join('\n');
}

Uri supportWhatsappUri(String number, String message) {
  final digits = number.replaceAll(RegExp(r'\D'), '');
  return Uri.https('wa.me', '/$digits', {'text': message});
}

class SupportWhatsappClient {
  const SupportWhatsappClient({this.httpClient});

  final http.Client? httpClient;

  Future<String> fetchNumber() async {
    final base = AppConfig.apiBaseUrl.trim();
    if (base.isEmpty) return defaultSupportWhatsappNumber;
    final root = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final uri = Uri.tryParse('$root/api/mobile/app-version');
    if (uri == null || !uri.hasScheme) return defaultSupportWhatsappNumber;

    final client = httpClient ?? http.Client();
    final ownsClient = httpClient == null;
    try {
      final response = await client
          .get(uri)
          .timeout(const Duration(seconds: 8));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return defaultSupportWhatsappNumber;
      }
      return supportNumberFromAppVersionBody(response.body);
    } catch (_) {
      return defaultSupportWhatsappNumber;
    } finally {
      if (ownsClient) client.close();
    }
  }
}
