import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Friendly load-error UI for customers — never shows raw exceptions/URLs.
class TakkaErrorRetry extends StatelessWidget {
  const TakkaErrorRetry({
    super.key,
    required this.onRetry,
    this.message = '(حدث خطأ)',
    this.icon = Icons.cloud_off_rounded,
  });

  final VoidCallback onRetry;
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 44, color: TakkaColors.muted),
              const SizedBox(height: 14),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
