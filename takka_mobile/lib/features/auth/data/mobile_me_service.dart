import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';

class MobileMeProfile {
  const MobileMeProfile({
    required this.appUserId,
    required this.role,
    required this.hasKitchen,
  });

  final String appUserId;
  final String? role;
  final bool hasKitchen;
}

class MobileMeService {
  const MobileMeService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<MobileMeProfile> loadProfile({
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
    final user = json['user'];
    if (user is! Map) {
      throw Exception('Invalid /api/mobile/me response');
    }

    return MobileMeProfile(
      appUserId: user['appUserId']?.toString() ?? '',
      role: user['role']?.toString(),
      hasKitchen: user['hasKitchen'] == true,
    );
  }

  Future<String> loadAppUserId({
    required String sessionToken,
  }) async {
    final profile = await loadProfile(sessionToken: sessionToken);
    return profile.appUserId;
  }
}
