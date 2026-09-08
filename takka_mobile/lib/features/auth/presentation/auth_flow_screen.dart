import 'package:flutter/material.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F2937),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'تكة',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'تطبيق واحد للعملاء والمطابخ. اختر دورك أثناء الدخول أو إنشاء الحساب.',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.88),
                        height: 1.6,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'اختر كيف ستستخدم تكة',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
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
                        icon: const Icon(Icons.login_rounded),
                        label: const Text('متابعة إلى تسجيل الدخول أو إنشاء الحساب'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        effectiveRole == AppRole.customer
                            ? 'بعد المصادقة سنثبت حسابك كعميل ونوجهك إلى مسار الطلبات والاستكشاف.'
                            : 'بعد المصادقة سنثبت حسابك كمطبخ ونوجهك إلى استكمال الملف والمنيو والطلبات.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade700,
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
    );
  }

  void _openAuthentication(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return const Padding(
          padding: EdgeInsets.all(16),
          child: ClerkAuthentication(),
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
    final theme = Theme.of(context);

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primary.withValues(alpha: 0.10)
              : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected
                ? theme.colorScheme.primary
                : Colors.grey.shade300,
            width: isSelected ? 1.6 : 1,
          ),
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: isSelected
                  ? theme.colorScheme.primary
                  : Colors.grey.shade200,
              foregroundColor: isSelected ? Colors.white : Colors.black87,
              child: Icon(
                role == AppRole.customer
                    ? Icons.shopping_bag_outlined
                    : Icons.storefront_outlined,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    role.label,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    role.subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      height: 1.5,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle_rounded,
                color: theme.colorScheme.primary,
              ),
          ],
        ),
      ),
    );
  }
}
