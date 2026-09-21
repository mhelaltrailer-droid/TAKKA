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
      lower.contains('http://') ||
      lower.contains('https://') ||
      lower.contains('uri=') ||
      lower.contains('errno') ||
      lower.contains('clerk.') ||
      message.contains('Exception:') ||
      message.contains('Error:');
}

String friendlyErrorMessage([Object? error]) {
  if (error == null) {
    return kFriendlyErrorMessage;
  }
  final raw = error.toString().trim();
  if (raw.isEmpty || isTechnicalErrorMessage(raw)) {
    return kFriendlyErrorMessage;
  }
  // Keep short Arabic app messages; still hide long dumps.
  if (raw.length > 120) {
    return kFriendlyErrorMessage;
  }
  return raw;
}

/// SnackBar with unified copy — never shows raw exceptions/URLs.
void showFriendlyError(
  BuildContext context, {
  Object? error,
  VoidCallback? onRetry,
}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) {
    return;
  }

  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      content: Text(friendlyErrorMessage(error)),
      action: onRetry == null
          ? null
          : SnackBarAction(
              label: kFriendlyRetryLabel,
              onPressed: onRetry,
            ),
    ),
  );
}
