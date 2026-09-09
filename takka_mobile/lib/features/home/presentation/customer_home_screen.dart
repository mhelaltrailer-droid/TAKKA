import 'package:flutter/material.dart';
import 'package:clerk_flutter/clerk_flutter.dart';

import '../../../core/location/delivery_location_header.dart';
import '../../../core/location/food_categories.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/food_categories_strip.dart';
import '../../../core/widgets/promo_carousel.dart';
import '../../cart/presentation/addresses_screen.dart';
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
    this.embeddedInShell = false,
  });

  final String displayName;
  final VoidCallback onSignOut;
  final VoidCallback onSwitchRole;
  final bool embeddedInShell;

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  final _service = const CustomerDiscoveryService();
  final _searchController = TextEditingController();
  Future<CustomerBootstrapData>? _bootstrapFuture;
  Future<List<PromoSlide>>? _promosFuture;
  String _selectedDistrict = '';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _loadBootstrap();
    _promosFuture = loadPromoSlides();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<CustomerBootstrapData> _loadBootstrap() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken().timeout(
      const Duration(seconds: 20),
      onTimeout: () => throw Exception('انتهت مهلة جلب جلسة الدخول.'),
    );
    // Load city-wide kitchens once; district is filtered locally (same as web).
    return _service.loadBootstrap(
      sessionToken: token.jwt,
      regionName: null,
    );
  }

  void _onDistrictChanged(String district) {
    if (_selectedDistrict == district) {
      return;
    }
    setState(() => _selectedDistrict = district);
  }

  List<KitchenSummary> _filterKitchens(List<KitchenSummary> kitchens) {
    var result = kitchens;
    if (_selectedDistrict.isNotEmpty) {
      result = result
          .where((kitchen) => kitchen.regionName == _selectedDistrict)
          .toList();
    }

    final query = _searchQuery.trim();
    if (query.isEmpty) {
      return result;
    }

    FoodCategory? category;
    for (final item in foodCategories) {
      if (item.label == query) {
        category = item;
        break;
      }
    }

    if (category != null) {
      return result
          .where(
            (kitchen) => kitchen.menuItemCategoryIds.contains(category!.id),
          )
          .toList();
    }

    final needle = query.toLowerCase();
    return result.where((kitchen) {
      if (kitchen.kitchenName.toLowerCase().contains(needle)) {
        return true;
      }
      if ((kitchen.description ?? '').toLowerCase().contains(needle)) {
        return true;
      }
      return kitchen.menuItemNames.any(
        (name) => name.toLowerCase().contains(needle),
      );
    }).toList();
  }

  void _onCategorySelected(String label) {
    final next = _searchQuery.trim() == label ? '' : label;
    _searchController.text = next;
    setState(() => _searchQuery = next);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.embeddedInShell
          ? AppBar(
              title: const Text('تكة'),
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
              ],
            )
          : AppBar(
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
          final kitchens = _filterKitchens(data.kitchens);

          return RefreshIndicator(
            onRefresh: () async {
              final future = _loadBootstrap();
              final promos = loadPromoSlides();
              setState(() {
                _bootstrapFuture = future;
                _promosFuture = promos;
              });
              await Future.wait([future, promos]);
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                DeliveryLocationHeader(
                  onDistrictChanged: _onDistrictChanged,
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    setState(() => _searchQuery = value);
                  },
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'ابحث عن مطبخ أو وجبة',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: _searchQuery.isEmpty
                        ? null
                        : IconButton(
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            icon: const Icon(Icons.close_rounded),
                          ),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(color: TakkaColors.softLine),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(color: TakkaColors.softLine),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(999),
                      borderSide: const BorderSide(
                        color: TakkaColors.primary,
                        width: 1.4,
                      ),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                FutureBuilder<List<PromoSlide>>(
                  future: _promosFuture,
                  builder: (context, promoSnapshot) {
                    final slides =
                        promoSnapshot.data ?? defaultPromoSlides;
                    return PromoCarousel(slides: slides);
                  },
                ),
                const SizedBox(height: 16),
                FoodCategoriesStrip(
                  selectedLabel: foodCategories.any(
                    (item) => item.label == _searchQuery.trim(),
                  )
                      ? _searchQuery.trim()
                      : null,
                  onSelect: _onCategorySelected,
                ),
                const SizedBox(height: 16),
                _WelcomeCard(
                  title: 'أهلًا ${data.user.fullName}',
                  description:
                      'اختر الحي لعرض المطابخ القريبة منك في مدينة العبور.',
                ),
                if (!widget.embeddedInShell) ...[
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
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const AddressesScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.location_on_outlined),
                    label: const Text('عناوين التوصيل'),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  _selectedDistrict.isEmpty
                      ? 'مطابخ قريبة منك'
                      : 'مطابخ قريبة منك · $_selectedDistrict',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 12),
                if (_selectedDistrict.isEmpty)
                  const _SelectDistrictHint()
                else if (kitchens.isEmpty)
                  _EmptyKitchensState(
                    district: _selectedDistrict,
                    searchQuery: _searchQuery,
                  )
                else
                  ...kitchens.map(
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
            title,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
              height: 1.6,
            ),
          ),
        ],
      ),
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
                        if (kitchen.menuItemNames.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            kitchen.menuItemNames.take(4).join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 12,
                            ),
                          ),
                        ],
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

class _SelectDistrictHint extends StatelessWidget {
  const _SelectDistrictHint();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Icon(Icons.place_outlined, size: 40),
            const SizedBox(height: 12),
            const Text(
              'اختر الحي أولًا',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'من أعلى الصفحة اختر الحي الذي تتواجد فيه لعرض المطابخ المسجّلة في نفس الحي.',
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

class _EmptyKitchensState extends StatelessWidget {
  const _EmptyKitchensState({
    required this.district,
    this.searchQuery = '',
  });

  final String district;
  final String searchQuery;

  @override
  Widget build(BuildContext context) {
    final hasSearch = searchQuery.trim().isNotEmpty;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              hasSearch ? Icons.search_off_rounded : Icons.store_mall_directory_outlined,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              hasSearch
                  ? 'لا توجد نتائج لـ «${searchQuery.trim()}»'
                  : 'لا توجد مطابخ في $district',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              hasSearch
                  ? 'جرّب اسم مطبخ أو وجبة أخرى داخل $district.'
                  : 'لم يسجّل أي مطبخ مفتوح موقعه في هذا الحي بعد. جرّب حيًا آخر أو اسحب للتحديث لاحقًا.',
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
