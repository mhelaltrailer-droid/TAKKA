import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class PushTokenApi {
  const PushTokenApi();

  Uri _uri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;
    return Uri.parse('$base$path');
  }

  Future<void> register({
    required String sessionToken,
    required String token,
    required String platform,
  }) async {
    final response = await http.post(
      _uri('/api/mobile/push-tokens'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'token': token, 'platform': platform}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('push token register failed: ${response.statusCode}');
    }
  }

  Future<void> unregister({
    required String sessionToken,
    required String token,
  }) async {
    final response = await http.delete(
      _uri('/api/mobile/push-tokens'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'token': token}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('push token unregister failed: ${response.statusCode}');
    }
  }
}
