import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/community/takka_partners_community.dart';
import '../../../core/realtime/kitchen_new_order_alert_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/data/mobile_me_service.dart';
import '../../kitchen_management/data/kitchen_management_service.dart';
import '../../kitchen_management/presentation/kitchen_menu_management_screen.dart';
import '../../kitchen_management/presentation/kitchen_onboarding_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../orders/presentation/kitchen_orders_screen.dart';

class KitchenHomeScreen extends StatefulWidget {
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
  State<KitchenHomeScreen> createState() => _KitchenHomeScreenState();
}

class _KitchenHomeScreenState extends State<KitchenHomeScreen> {
  final _service = const KitchenManagementService();
  final _meService = const MobileMeService();
  Future<KitchenProfileData?>? _profileFuture;

  @override
  void initState() {
    super.initState();
    _profileFuture = _loadProfile();
    _startNewOrderAlerts();
  }

  @override
  void dispose() {
    KitchenNewOrderAlertService.instance.stop();
    super.dispose();
  }

  Future<void> _startNewOrderAlerts() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final appUserId = await _meService.loadAppUserId(sessionToken: token.jwt);
      if (!mounted || appUserId.isEmpty) {
        return;
      }
      await KitchenNewOrderAlertService.instance.start(appUserId: appUserId);
    } catch (_) {}
  }

  Future<KitchenProfileData?> _loadProfile() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _service.loadProfile(sessionToken: token.jwt);
  }

  Future<void> _openTakkaFamily() async {
    final uri = Uri.parse(takkaPartnersCommunityUrl);
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر فتح رابط مجتمع واتساب.')),
      );
    }
  }

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
            onPressed: widget.onSwitchRole,
            icon: const Icon(Icons.swap_horiz_rounded),
            tooltip: 'التحول إلى مسار العميل',
          ),
          IconButton(
            onPressed: widget.onSignOut,
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'تسجيل الخروج',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _KitchenIntroCard(displayName: widget.displayName),
          const SizedBox(height: 16),
          FutureBuilder<KitchenProfileData?>(
            future: _profileFuture,
            builder: (context, snapshot) {
              final approved = snapshot.data?.approvalStatus == 'APPROVED';
              if (!approved) {
                return const SizedBox.shrink();
              }
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: _TakkaFamilyJoinCard(onJoin: _openTakkaFamily),
              );
            },
          ),
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

class _TakkaFamilyJoinCard extends StatelessWidget {
  const _TakkaFamilyJoinCard({
    required this.onJoin,
  });

  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFECFDF5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFFA7F3D0)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: TakkaColors.primary.withValues(alpha: 0.15),
                  child: Icon(
                    Icons.groups_2_outlined,
                    color: TakkaColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    takkaFamilyJoinTitle,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              takkaFamilyJoinBody,
              style: TextStyle(height: 1.55),
            ),
            const SizedBox(height: 8),
            Text(
              takkaFamilyJoinNote,
              style: TextStyle(
                fontSize: 12,
                height: 1.45,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: onJoin,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Text(takkaFamilyJoinTitle),
            ),
          ],
        ),
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
