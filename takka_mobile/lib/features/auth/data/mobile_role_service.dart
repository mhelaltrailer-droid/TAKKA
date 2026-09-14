import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import 'app_role.dart';

class NeedsKitchenOnboardingException implements Exception {
  const NeedsKitchenOnboardingException([
    this.message =
        'هذا الحساب حساب عميل. أكمل نموذج انضمام المطبخ أولًا.',
  ]);

  final String message;

  @override
  String toString() => message;
}

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

    if (response.statusCode == 409) {
      try {
        final body = jsonDecode(response.body);
        if (body is Map && body['error'] == 'NEEDS_KITCHEN_ONBOARDING') {
          throw NeedsKitchenOnboardingException(
            body['message']?.toString() ??
                'هذا الحساب حساب عميل. أكمل نموذج انضمام المطبخ أولًا.',
          );
        }
      } catch (error) {
        if (error is NeedsKitchenOnboardingException) {
          rethrow;
        }
      }
      throw const NeedsKitchenOnboardingException();
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'Role sync failed with status ${response.statusCode}: ${response.body}',
      );
    }
  }
}
