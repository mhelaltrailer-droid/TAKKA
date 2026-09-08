import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/config/app_config.dart';
import '../data/app_role.dart';
import '../data/mobile_role_service.dart';

class RoleSetupScreen extends StatefulWidget {
  const RoleSetupScreen({
    super.key,
    required this.initialRole,
    required this.onRoleSaved,
  });

  final AppRole initialRole;
  final ValueChanged<AppRole> onRoleSaved;

  @override
  State<RoleSetupScreen> createState() => _RoleSetupScreenState();
}

class _RoleSetupScreenState extends State<RoleSetupScreen> {
  final _roleService = const MobileRoleService();
  late AppRole _selectedRole = widget.initialRole;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('اختيار نوع الحساب'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'اختر المسار الذي تريد متابعته داخل التطبيق',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'سيتم حفظ الدور في Clerk والـ backend حتى يفتح التطبيق نفس التجربة المناسبة لك في كل مرة.',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade700,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 18),
                  _RoleOption(
                    role: AppRole.customer,
                    selectedRole: _selectedRole,
                    onTap: () => setState(() => _selectedRole = AppRole.customer),
                  ),
                  const SizedBox(height: 12),
                  _RoleOption(
                    role: AppRole.kitchenOwner,
                    selectedRole: _selectedRole,
                    onTap: () =>
                        setState(() => _selectedRole = AppRole.kitchenOwner),
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _isSaving ? null : _saveRole,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.verified_user_outlined),
                    label: Text(
                      _isSaving ? 'جارٍ حفظ الدور...' : 'تأكيد ومتابعة',
                    ),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'عنوان الـ API الحالي: ${AppConfig.apiBaseUrl}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade700,
                    ),
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage!,
                      style: TextStyle(
                        color: theme.colorScheme.error,
                        height: 1.5,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveRole() async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final sessionToken = await authState.sessionToken();

      await _roleService.saveRole(
        sessionToken: sessionToken.jwt,
        role: _selectedRole,
      );

      await authState.refreshClient();
      widget.onRoleSaved(_selectedRole);

      if (!mounted) {
        return;
      }

      Navigator.of(context).maybePop();
      setState(() {
        _isSaving = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isSaving = false;
        _errorMessage =
            'تعذر حفظ الدور الآن. تأكد أن خادم Next.js يعمل وأن عنوان `TAKKA_API_BASE_URL` صحيح. التفاصيل: $error';
      });
    }
  }
}

class _RoleOption extends StatelessWidget {
  const _RoleOption({
    required this.role,
    required this.selectedRole,
    required this.onTap,
  });

  final AppRole role;
  final AppRole selectedRole;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSelected = role == selectedRole;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primary.withValues(alpha: 0.08)
              : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected
                ? theme.colorScheme.primary
                : Colors.grey.shade300,
          ),
        ),
        child: Row(
          children: [
            Icon(
              role == AppRole.customer
                  ? Icons.shopping_bag_outlined
                  : Icons.storefront_outlined,
              color: isSelected ? theme.colorScheme.primary : Colors.black87,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    role.label,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    role.subtitle,
                    style: TextStyle(
                      color: Colors.grey.shade700,
                      height: 1.5,
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
