import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';

class MobileMeService {
  const MobileMeService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<String> loadAppUserId({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/mobile/me'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load app user: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return json['appUserId']?.toString() ?? '';
  }
}
