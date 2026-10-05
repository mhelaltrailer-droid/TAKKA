import 'package:clerk_auth/clerk_auth.dart' as clerk;
import 'package:flutter/material.dart';

const kFriendlyErrorMessage = '(حدث خطأ)';
const kFriendlyRetryLabel = 'إعادة المحاولة';

/// True for raw network/Clerk/exception dumps that must never reach customers.
bool isTechnicalErrorMessage(String message) {
  final lower = message.toLowerCase();
  return lower.contains('clientexception') ||
      lower.contains('socketexception') ||
      lower.contains('failed host lookup') ||
      lower.contains('external error') ||
      lower.contains('error received from server') ||
      lower.contains('http://') ||
      lower.contains('https://') ||
      lower.contains('uri=') ||
      lower.contains('errno') ||
      lower.contains('clerk.') ||
      message.contains('Exception:') ||
      message.contains('Error:');
}

String _unwrapErrorText(Object error) {
  if (error is clerk.ClerkError) {
    return clerkUserFacingMessage(error);
  }

  // Prefer plain message without Dart's "Exception:" / "Error:" prefix.
  if (error is Exception) {
    final full = error.toString().trim();
    if (full.startsWith('Exception: ')) {
      return full.substring('Exception: '.length).trim();
    }
  }
  if (error is Error) {
    final full = error.toString().trim();
    if (full.startsWith('Error: ')) {
      return full.substring('Error: '.length).trim();
    }
  }

  return error.toString().trim();
}

String friendlyErrorMessage([Object? error]) {
  if (error == null) {
    return kFriendlyErrorMessage;
  }
  if (error is clerk.ClerkError) {
    return clerkUserFacingMessage(error);
  }

  final raw = _unwrapErrorText(error);
  if (raw.isEmpty || isTechnicalErrorMessage(raw)) {
    return kFriendlyErrorMessage;
  }
  // Keep short Arabic app messages; still hide long dumps.
  if (raw.length > 120) {
    return kFriendlyErrorMessage;
  }
  return raw;
}

/// Map Clerk API / SDK errors to short Arabic copy for auth forms.
String clerkUserFacingMessage(clerk.ClerkError error) {
  final serverErrors = error.errors?.errors ?? [];
  final codes = <String>[
    for (final item in serverErrors)
      if (item.code case final code?) code.toLowerCase(),
  ];
  final haystack = [
    error.toString(),
    error.argument ?? '',
    error.errors?.errorMessage ?? '',
    ...codes,
  ].join(' ').toLowerCase();

  if (codes.contains('form_identifier_exists') ||
      haystack.contains('already been taken') ||
      haystack.contains('is taken') ||
      haystack.contains('identifier exists')) {
    return 'هذا البريد الإلكتروني مستخدم بالفعل. سجّل الدخول أو استخدم بريدًا آخر.';
  }
  if (codes.contains('form_password_pwned') ||
      haystack.contains('data breach') ||
      haystack.contains('found in an online')) {
    return 'كلمة المرور ضعيفة أو معروفة. اختر كلمة مرور أقوى.';
  }
  if (codes.contains('form_password_length_too_short') ||
      haystack.contains('at least 8')) {
    return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
  }
  if (codes.contains('form_code_incorrect') ||
      codes.contains('form_code_expired') ||
      haystack.contains('incorrect code') ||
      haystack.contains('is incorrect') ||
      haystack.contains('expired')) {
    return 'رمز التأكيد غير صحيح أو منتهي. أعد المحاولة أو اطلب رمزًا جديدًا.';
  }
  if (codes.contains('form_param_format_invalid') ||
      haystack.contains('is invalid') ||
      haystack.contains('valid email')) {
    return 'تحقق من صحة البريد الإلكتروني وحاول مجددًا.';
  }
  if (codes.contains('too_many_requests') ||
      haystack.contains('too many requests') ||
      haystack.contains('rate limit')) {
    return 'محاولات كثيرة. انتظر لحظات ثم أعد المحاولة.';
  }
  if (haystack.contains('password') && haystack.contains('match')) {
    return 'كلمة المرور وتأكيدها غير متطابقين.';
  }

  final raw = error.toString()
      .replaceAll(RegExp(r'\s*\(ERROR RECEIVED FROM SERVER\)\s*', caseSensitive: false), '')
      .replaceAll(RegExp(r'\s*\(EXTERNAL ERROR\)\s*', caseSensitive: false), '')
      .trim();
  if (raw.isNotEmpty &&
      !isTechnicalErrorMessage(raw) &&
      raw.length <= 120 &&
      // Prefer Arabic app copy; keep short non-technical Clerk messages only as fallback.
      !RegExp(r'^[A-Za-z0-9 ,.\-!?]+$').hasMatch(raw)) {
    return raw;
  }

  return kFriendlyErrorMessage;
}

/// SnackBar with unified copy — never shows raw exceptions/URLs.
///
/// Auto-dismisses even when a retry action is present (Flutter defaults to
/// persisting SnackBars that have an action).
void showFriendlyError(
  BuildContext context, {
  Object? error,
  VoidCallback? onRetry,
  Duration duration = const Duration(seconds: 5),
}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) {
    return;
  }

  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      content: Text(friendlyErrorMessage(error)),
      duration: duration,
      persist: false,
      action: onRetry == null
          ? null
          : SnackBarAction(
              label: kFriendlyRetryLabel,
              onPressed: onRetry,
            ),
    ),
  );
}
