import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/widgets.dart';

/// Shared Clerk session JWT with a hard timeout (avoids infinite spinners).
Future<String> requireSessionJwt(
  BuildContext context, {
  Duration timeout = const Duration(seconds: 20),
}) async {
  final authState = ClerkAuth.of(context, listen: false);
  final token = await authState.sessionToken().timeout(
    timeout,
    onTimeout: () => throw Exception('انتهت مهلة جلب جلسة الدخول.'),
  );
  return token.jwt;
}
