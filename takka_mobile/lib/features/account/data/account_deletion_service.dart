import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';

class AccountDeletionService {
  const AccountDeletionService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;
    return Uri.parse('$base$path');
  }

  Future<void> deleteAccount({required String sessionToken}) async {
    final response = await http.delete(
      _buildUri('/api/mobile/account'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Accept': 'application/json',
      },
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return;
    }

    String message = 'تعذر حذف الحساب.';
    try {
      final json = jsonDecode(response.body);
      if (json is Map) {
        final fromBody =
            json['message']?.toString() ?? json['error']?.toString();
        if (fromBody != null && fromBody.trim().isNotEmpty) {
          message = fromBody;
        }
      }
    } catch (_) {}
    throw Exception(message);
  }
}
