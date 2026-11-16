import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Shown while Clerk restores the persisted client, and while a signed-in
/// user has no cached role yet. This is not the sign-in screen.
class SessionRestoreSplash extends StatelessWidget {
  const SessionRestoreSplash({super.key});

  @override
  Widget build(BuildContext context) {
    return const Directionality(
      textDirection: TextDirection.rtl,
      child: Material(
        color: TakkaColors.cream,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 36,
                height: 36,
                child: CircularProgressIndicator(strokeWidth: 3),
              ),
              SizedBox(height: 16),
              Text(
                'جارٍ فتح حسابك…',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: TakkaColors.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Signed in, but neither the cache nor the server could provide a role.
class SessionRestoreRetry extends StatelessWidget {
  const SessionRestoreRetry({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                size: 48,
                color: TakkaColors.secondary,
              ),
              const SizedBox(height: 16),
              Text(
                'مش قادرين نكمل فتح الحساب',
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              const Text(
                'الجلسة محفوظة على الجهاز. النت أو السيرفر مش متاحين دلوقتي، فمش هنطلب تسجيل الدخول تاني.',
                textAlign: TextAlign.center,
                style: TextStyle(height: 1.6, color: TakkaColors.muted),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: onRetry,
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Non-blocking notice when the home is already known but `/me` failed.
class OfflineRoleBanner extends StatelessWidget {
  const OfflineRoleBanner({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFFFE8D2),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
        child: Row(
          children: [
            const Expanded(
              child: Text(
                'مش قادرين نحدّث بيانات الحساب. هتكمل بالبيانات المحفوظة.',
                style: TextStyle(height: 1.45, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(width: 8),
            TextButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
          ],
        ),
      ),
    );
  }
}
