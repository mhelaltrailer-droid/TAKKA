import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../../features/kitchen_management/presentation/kitchen_onboarding_screen.dart';
import 'kitchen_onboarding_copy.dart';

enum KitchenFeatureAccess {
  needsSetup,
  needsApproval,
  ready,
}

KitchenFeatureAccess kitchenFeatureAccessFromStatus(String? approvalStatus) {
  if (approvalStatus == null || approvalStatus.trim().isEmpty) {
    return KitchenFeatureAccess.needsSetup;
  }
  if (approvalStatus == 'APPROVED') {
    return KitchenFeatureAccess.ready;
  }
  return KitchenFeatureAccess.needsApproval;
}

/// Friendly placeholder instead of generic "(حدث خطأ)" when kitchen isn't ready.
class KitchenFeatureGate extends StatelessWidget {
  const KitchenFeatureGate({
    super.key,
    required this.access,
  });

  final KitchenFeatureAccess access;

  @override
  Widget build(BuildContext context) {
    final isSetup = access == KitchenFeatureAccess.needsSetup;
    final title =
        isSetup ? kitchenFeatureNeedsSetupTitle : kitchenFeatureNeedsApprovalTitle;
    final body =
        isSetup ? kitchenFeatureNeedsSetupBody : kitchenFeatureNeedsApprovalBody;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: Card(
          color: const Color(0xFFFFF8E1),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(
                  isSetup
                      ? Icons.storefront_outlined
                      : Icons.hourglass_top_rounded,
                  size: 40,
                  color: TakkaColors.primary,
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: TakkaColors.ink,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  body,
                  textAlign: TextAlign.center,
                  style: const TextStyle(height: 1.6, fontSize: 15),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const KitchenOnboardingScreen(),
                      ),
                    );
                  },
                  child: const Text(kitchenFeatureOpenOnboarding),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
