import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import 'app_role.dart';

class MobileRoleService {
  const MobileRoleService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<void> saveRole({
    required String sessionToken,
    required AppRole role,
  }) async {
    final response = await http.post(
      _buildUri('/api/mobile/role'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
      body: jsonEncode({
        'role': role.apiValue,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Role sync failed with status ${response.statusCode}: ${response.body}',
      );
    }
  }
}
