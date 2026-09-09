import 'package:flutter/material.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../data/app_role.dart';

class AuthFlowScreen extends StatelessWidget {
  const AuthFlowScreen({
    super.key,
    required this.selectedRole,
    required this.onRoleSelected,
  });

  final AppRole? selectedRole;
  final ValueChanged<AppRole> onRoleSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final effectiveRole = selectedRole ?? AppRole.customer;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFFFE8D2),
              TakkaColors.cream,
              Color(0xFFFFFDF9),
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(26),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(32),
                    gradient: const LinearGradient(
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                      colors: [
                        TakkaColors.deep,
                        Color(0xFF3A2419),
                        TakkaColors.secondary,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: TakkaColors.secondary.withValues(alpha: 0.28),
                        blurRadius: 28,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.asset(
                              'assets/branding/takka_icon.png',
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              'تكة',
                              style: theme.textTheme.displaySmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Text(
                        'كله على تكة',
                        style: theme.textTheme.titleLarge?.copyWith(
                          color: const Color(0xFFFFD7B0),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'اطلب الأكل البيتي من مطابخ قريبة، أو أدِر مطبخك من نفس التطبيق.',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                          height: 1.65,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'اختر كيف ستستخدم تكة',
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _RoleCard(
                          role: AppRole.customer,
                          isSelected: effectiveRole == AppRole.customer,
                          onTap: () => onRoleSelected(AppRole.customer),
                        ),
                        const SizedBox(height: 12),
                        _RoleCard(
                          role: AppRole.kitchenOwner,
                          isSelected: effectiveRole == AppRole.kitchenOwner,
                          onTap: () => onRoleSelected(AppRole.kitchenOwner),
                        ),
                        const SizedBox(height: 20),
                        FilledButton.icon(
                          onPressed: () => _openAuthentication(context),
                          icon: const Icon(Icons.arrow_back_rounded),
                          label: const Text('متابعة لتسجيل الدخول'),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          effectiveRole == AppRole.customer
                              ? 'بعد الدخول ستنتقل لاستكشاف المطابخ ومتابعة طلباتك.'
                              : 'بعد الدخول ستنتقل لإعداد المطبخ والمنيو واستقبال الطلبات.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: TakkaColors.muted,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openAuthentication(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 12,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: const SizedBox(
              height: 520,
              child: ClerkAuthentication(),
            ),
          ),
        );
      },
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.role,
    required this.isSelected,
    required this.onTap,
  });

  final AppRole role;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? TakkaColors.primary.withValues(alpha: 0.08)
              : const Color(0xFFFFFCF8),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected ? TakkaColors.primary : TakkaColors.softLine,
            width: isSelected ? 1.6 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: isSelected
                    ? TakkaColors.primary.withValues(alpha: 0.14)
                    : Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                role == AppRole.customer
                    ? Icons.shopping_bag_outlined
                    : Icons.storefront_outlined,
                color: isSelected ? TakkaColors.primary : TakkaColors.ink,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    role.label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    role.subtitle,
                    style: const TextStyle(
                      color: TakkaColors.muted,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded, color: TakkaColors.primary),
          ],
        ),
      ),
    );
  }
}
