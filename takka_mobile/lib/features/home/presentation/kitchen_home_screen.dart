import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../kitchen_management/presentation/kitchen_menu_management_screen.dart';
import '../../kitchen_management/presentation/kitchen_onboarding_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../orders/presentation/kitchen_orders_screen.dart';

class KitchenHomeScreen extends StatelessWidget {
  const KitchenHomeScreen({
    super.key,
    required this.displayName,
    required this.onSignOut,
    required this.onSwitchRole,
  });

  final String displayName;
  final VoidCallback onSignOut;
  final VoidCallback onSwitchRole;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تكة - المطبخ'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const NotificationsScreen(),
                ),
              );
            },
            icon: const Icon(Icons.notifications_none_rounded),
            tooltip: 'الإشعارات',
          ),
          IconButton(
            onPressed: onSwitchRole,
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'التحول إلى مسار العميل',
          ),
          IconButton(
            onPressed: onSignOut,
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'تسجيل الخروج',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _KitchenIntroCard(displayName: displayName),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const KitchenOnboardingScreen(),
                ),
              );
            },
            icon: const Icon(Icons.verified_user_outlined),
            label: const Text('إعداد المطبخ'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const KitchenMenuManagementScreen(),
                ),
              );
            },
            icon: const Icon(Icons.restaurant_menu_outlined),
            label: const Text('إدارة المنيو'),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const KitchenOrdersScreen(),
                ),
              );
            },
            icon: const Icon(Icons.receipt_long_outlined),
            label: const Text('طلبات المطبخ'),
          ),
          const SizedBox(height: 16),
          const _KitchenActionTile(
            icon: Icons.verified_user_outlined,
            title: 'استكمال الملف والاعتماد',
            description: 'إعداد بيانات المطبخ ورفع المستندات من نفس التطبيق.',
          ),
          const _KitchenActionTile(
            icon: Icons.restaurant_menu_outlined,
            title: 'إدارة المنيو',
            description: 'إضافة الأصناف، تعديل الأسعار، والتحكم في التوفر.',
          ),
          const _KitchenActionTile(
            icon: Icons.local_shipping_outlined,
            title: 'إدارة الطلبات',
            description: 'قبول الطلبات، تحديد رسوم التوصيل، ومتابعة الحالات.',
          ),
        ],
      ),
    );
  }
}

class _KitchenIntroCard extends StatelessWidget {
  const _KitchenIntroCard({
    required this.displayName,
  });

  final String displayName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            TakkaColors.deep,
            Color(0xFF3A2419),
            TakkaColors.secondary,
          ],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: TakkaColors.secondary.withValues(alpha: 0.25),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.asset(
                  'assets/branding/takka_icon.png',
                  width: 44,
                  height: 44,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'تكة',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'مرحبًا $displayName',
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'من هنا تكمل بيانات مطبخك، تدير المنيو، وتستقبل الطلبات وتحدّث حالتها.',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.90),
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

class _KitchenActionTile extends StatelessWidget {
  const _KitchenActionTile({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(18),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
          child: Icon(icon, color: theme.colorScheme.primary),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            description,
            style: TextStyle(
              color: Colors.grey.shade700,
              height: 1.5,
            ),
          ),
        ),
      ),
    );
  }
}
