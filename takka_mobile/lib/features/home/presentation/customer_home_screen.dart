import 'package:flutter/material.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

import '../../notifications/presentation/notifications_screen.dart';
import '../../orders/presentation/my_orders_screen.dart';
import '../data/customer_discovery_service.dart';
import 'kitchen_details_screen.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({
    super.key,
    required this.displayName,
    required this.onSignOut,
    required this.onSwitchRole,
  });

  final String displayName;
  final VoidCallback onSignOut;
  final VoidCallback onSwitchRole;

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  final _service = const CustomerDiscoveryService();
  Future<CustomerBootstrapData>? _bootstrapFuture;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _loadBootstrap();
  }

  Future<CustomerBootstrapData> _loadBootstrap() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _service.loadBootstrap(sessionToken: token.jwt);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تكة - العميل'),
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
            tooltip: 'التحول إلى مسار المطبخ',
          ),
          IconButton(
            onPressed: widget.onSignOut,
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'تسجيل الخروج',
          ),
        ],
      ),
      body: FutureBuilder<CustomerBootstrapData>(
        future: _bootstrapFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _CustomerErrorState(
              message: snapshot.error.toString(),
              onRetry: () {
                setState(() {
                  _bootstrapFuture = _loadBootstrap();
                });
              },
            );
          }

          final data = snapshot.data!;

          return RefreshIndicator(
            onRefresh: () async {
              final future = _loadBootstrap();
              setState(() {
                _bootstrapFuture = future;
              });
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _WelcomeCard(
                  title: 'أهلًا ${data.user.fullName}',
                  description:
                      'هذه أول شاشة عميل حقيقية بعد تسجيل الدخول. تم ربطها بجلسة الموبايل وباكتشاف المطابخ المتاحة مباشرة من الـ backend.',
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const MyOrdersScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.receipt_long_outlined),
                  label: const Text('طلباتي'),
                ),
                const SizedBox(height: 16),
                _QuickStatsCard(
                  kitchensCount: data.kitchens.length,
                  userRole: data.user.role,
                ),
                const SizedBox(height: 16),
                Text(
                  'المطابخ المتاحة',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 12),
                if (data.kitchens.isEmpty)
                  const _EmptyKitchensState()
                else
                  ...data.kitchens.map(
                    (kitchen) => _KitchenCard(kitchen: kitchen),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({
    required this.title,
    required this.description,
  });

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primary,
            const Color(0xFF1F2937),
          ],
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            description,
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

class _QuickStatsCard extends StatelessWidget {
  const _QuickStatsCard({
    required this.kitchensCount,
    required this.userRole,
  });

  final int kitchensCount;
  final String userRole;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Expanded(
              child: _StatBlock(
                label: 'الدور الحالي',
                value: userRole,
              ),
            ),
            Expanded(
              child: _StatBlock(
                label: 'مطابخ متاحة',
                value: kitchensCount.toString(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBlock extends StatelessWidget {
  const _StatBlock({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _KitchenCard extends StatelessWidget {
  const _KitchenCard({
    required this.kitchen,
  });

  final KitchenSummary kitchen;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => KitchenDetailsScreen(
                kitchenIdOrSlug: kitchen.slug.isNotEmpty ? kitchen.slug : kitchen.id,
                title: kitchen.kitchenName,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor:
                        theme.colorScheme.primary.withValues(alpha: 0.12),
                    backgroundImage:
                        kitchen.logoUrl != null ? NetworkImage(kitchen.logoUrl!) : null,
                    child: kitchen.logoUrl == null
                        ? Icon(
                            Icons.storefront_outlined,
                            color: theme.colorScheme.primary,
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          kitchen.kitchenName,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${kitchen.cityName} - ${kitchen.regionName}',
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F5F4),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${kitchen.menuItemsCount} صنف',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              if (kitchen.description case final description?
                  when description.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  description,
                  style: TextStyle(
                    color: Colors.grey.shade800,
                    height: 1.5,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              Row(
                children: [
                  Icon(Icons.star_rounded, color: Colors.amber.shade700),
                  const SizedBox(width: 4),
                  Text(
                    kitchen.averageRating.toStringAsFixed(1),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '(${kitchen.reviewsCount} تقييم)',
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                  const Spacer(),
                  Text(
                    'عرض التفاصيل',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyKitchensState extends StatelessWidget {
  const _EmptyKitchensState();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.store_mall_directory_outlined, size: 40),
            const SizedBox(height: 12),
            const Text(
              'لا توجد مطابخ متاحة حاليًا',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'تأكد من وجود مطابخ معتمدة ومفتوحة داخل لوحة الويب، ثم اسحب للتحديث.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey.shade700,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CustomerErrorState extends StatelessWidget {
  const _CustomerErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_rounded, size: 44),
                const SizedBox(height: 14),
                const Text(
                  'تعذر تحميل بيانات العميل أو المطابخ',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    height: 1.5,
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
      ),
    );
  }
}
