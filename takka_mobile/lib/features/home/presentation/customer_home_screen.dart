import 'package:flutter/material.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/location/delivery_location_header.dart';
import '../../../core/location/food_categories.dart';
import '../../../core/location/obour_nearby_districts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../../../core/widgets/food_categories_strip.dart';
import '../../../core/widgets/promo_carousel.dart';
import '../../auth/presentation/guest_sign_up_prompt.dart';
import '../../cart/presentation/addresses_screen.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../orders/presentation/my_orders_screen.dart';
import '../data/customer_discovery_service.dart';
import 'deals_browse_screen.dart';
import 'kitchen_details_screen.dart';
import 'nearby_deals_strip.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({
    super.key,
    required this.displayName,
    required this.onSignOut,
    required this.onSwitchRole,
    this.embeddedInShell = false,
    this.isGuest = false,
  });

  final String displayName;
  final VoidCallback onSignOut;
  final VoidCallback onSwitchRole;
  final bool embeddedInShell;
  final bool isGuest;

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  final _service = const CustomerDiscoveryService();
  final _searchController = TextEditingController();
  Future<CustomerBootstrapData>? _bootstrapFuture;
  Future<List<PromoSlide>>? _promosFuture;
  List<FoodCategory> _foodCategories = defaultFoodCategories;
  String _selectedDistrict = '';
  String _selectedCategory = '';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _loadBootstrap();
    _promosFuture = loadPromoSlides();
    _loadFoodCategories();
  }

  Future<void> _loadFoodCategories() async {
    final categories = await loadFoodCategories();
    if (!mounted) {
      return;
    }
    setState(() => _foodCategories = categories);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<CustomerBootstrapData> _loadBootstrap() async {
    if (widget.isGuest) {
      return _service.loadBootstrap(regionName: null);
    }
    final jwt = await requireSessionJwt(context);
    // Load city-wide kitchens once; nearby list is filtered locally by district.
    return _service.loadBootstrap(
      sessionToken: jwt,
      regionName: null,
    );
  }

  Future<void> _requireRegistered(VoidCallback action) async {
    if (widget.isGuest) {
      await showGuestSignUpPrompt(context);
      return;
    }
    action();
  }

  void _onDistrictChanged(String district) {
    if (_selectedDistrict == district) {
      return;
    }
    setState(() => _selectedDistrict = district);
  }

  List<KitchenSummary> _nearbyKitchens(List<KitchenSummary> kitchens) {
    var result = kitchens;

    if (_selectedDistrict.isNotEmpty) {
      result = kitchens
          .where(
            (kitchen) => kitchenMatchesDistrict(
              kitchen.regionName,
              _selectedDistrict,
            ),
          )
          .toList();
    }

    return _filterByCategory(result);
  }

  List<KitchenSummary> _adjacentKitchens(List<KitchenSummary> kitchens) {
    if (_selectedDistrict.isEmpty) {
      return const [];
    }

    final adjacentNames = getNearbyDistrictNames(_selectedDistrict);
    if (adjacentNames.isEmpty) {
      return const [];
    }

    final adjacent = kitchens
        .where(
          (kitchen) => kitchenMatchesAnyDistrict(
            kitchen.regionName,
            adjacentNames,
          ),
        )
        .toList();

    return _filterByCategory(adjacent);
  }

  /// Cascade: district → adjacent → city-wide. No explanatory UI.
  List<KitchenSummary> _discoveryKitchens(List<KitchenSummary> kitchens) {
    if (_selectedDistrict.isEmpty) {
      return _filterByCategory(kitchens);
    }

    final inDistrict = _nearbyKitchens(kitchens);
    if (inDistrict.isNotEmpty) {
      return inDistrict;
    }

    final adjacent = _adjacentKitchens(kitchens);
    if (adjacent.isNotEmpty) {
      return adjacent;
    }

    return _filterByCategory(kitchens);
  }

  List<KitchenSummary> _filterByCategory(List<KitchenSummary> kitchens) {
    if (_selectedCategory.isEmpty) {
      return kitchens;
    }

    FoodCategory? category;
    for (final item in _foodCategories) {
      if (item.label == _selectedCategory) {
        category = item;
        break;
      }
    }
    if (category == null) {
      return kitchens;
    }

    return kitchens
        .where((kitchen) => kitchen.menuItemCategoryIds.contains(category!.id))
        .toList();
  }

  List<KitchenSummary> _allKitchens(List<KitchenSummary> kitchens) {
    final query = _searchQuery.trim();
    if (query.isEmpty) {
      return kitchens;
    }

    final needle = query.toLowerCase();
    return kitchens.where((kitchen) {
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
    setState(() {
      _selectedCategory = _selectedCategory == label ? '' : label;
    });
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
                    _requireRegistered(() {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      );
                    });
                  },
                  icon: const Icon(Icons.notifications_none_rounded),
                  tooltip: 'الإشعارات',
                ),
              ],
            )
          : AppBar(
              title: Text(widget.isGuest ? 'تكة · زائر' : 'تكة - العميل'),
              actions: [
                if (widget.isGuest)
                  TextButton(
                    onPressed: () => showGuestSignUpPrompt(context),
                    child: const Text(
                      'سجل الآن',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                if (!widget.isGuest)
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
                if (!widget.isGuest)
                  IconButton(
                    onPressed: widget.onSwitchRole,
                    icon: const Icon(Icons.swap_horiz_rounded),
                    tooltip: 'إنشاء حساب مطبخ / العودة للمطبخ',
                  ),
                IconButton(
                  onPressed: widget.onSignOut,
                  icon: Icon(
                    widget.isGuest ? Icons.close_rounded : Icons.logout_rounded,
                  ),
                  tooltip: widget.isGuest ? 'العودة لتسجيل الدخول' : 'تسجيل الخروج',
                ),
              ],
            ),
      body: FutureBuilder<CustomerBootstrapData>(
        future: _bootstrapFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const CustomerHomeSkeleton();
          }

          if (snapshot.hasError) {
            return Center(
              child: TakkaErrorRetry(
                onRetry: () {
                  setState(() {
                    _bootstrapFuture = _loadBootstrap();
                  });
                },
              ),
            );
          }

          final data = snapshot.data!;
          final discovery = _discoveryKitchens(data.kitchens);
          final allKitchens = _allKitchens(data.kitchens);

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
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const DealsBrowseScreen(),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(18),
                    child: Ink(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: const Color(0xFFFFB86B),
                          width: 2,
                        ),
                        gradient: const LinearGradient(
                          begin: Alignment.centerRight,
                          end: Alignment.centerLeft,
                          colors: [
                            Color(0xFFFFF7ED),
                            Color(0xFFECFDF5),
                          ],
                        ),
                      ),
                      child: const Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '🔥 العروض',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'كل العروض وأطباق اليوم في مدينة العبور',
                                  style: TextStyle(
                                    color: TakkaColors.muted,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Icons.chevron_left_rounded,
                            color: Color(0xFFE67E22),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                NearbyDealsStrip(regionName: _selectedDistrict),
                FoodCategoriesStrip(
                  categories: _foodCategories,
                  selectedLabel: _foodCategories.any(
                    (item) => item.label == _selectedCategory,
                  )
                      ? _selectedCategory
                      : null,
                  onSelect: _onCategorySelected,
                ),
                const SizedBox(height: 16),
                _WelcomeCard(
                  title: widget.isGuest
                      ? 'أهلًا بك كزائر'
                      : 'أهلًا ${data.user.fullName}',
                  description: widget.isGuest
                      ? 'يمكنك استعراض المطابخ والأصناف والأسعار. للطلب أو أي خطوة أخرى سجّل كعميل.'
                      : 'تاكل ايه؟ للمطابخ القريبة حسب حيك، واستعراض المطابخ لكل المطابخ المتاحة.',
                ),
                if (!widget.embeddedInShell && !widget.isGuest) ...[
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
                if (widget.isGuest) ...[
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => showGuestSignUpPrompt(context),
                    child: const Text('سجل الآن للمتابعة'),
                  ),
                ],
                const SizedBox(height: 16),
                Text(
                  _selectedDistrict.isEmpty
                      ? _selectedCategory.isEmpty
                          ? 'المطابخ المتاحة'
                          : 'المطابخ المتاحة · $_selectedCategory'
                      : _selectedCategory.isEmpty
                          ? 'مطابخ قريبة منك · $_selectedDistrict'
                          : 'مطابخ قريبة · $_selectedDistrict · $_selectedCategory',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 12),
                if (_selectedDistrict.isEmpty) ...[
                  const _SelectDistrictHint(),
                  const SizedBox(height: 12),
                  if (discovery.isEmpty)
                    const _EmptyAllKitchensState()
                  else
                    ...discovery.map(
                      (kitchen) => _KitchenCard(
                        kitchen: kitchen,
                        isGuest: widget.isGuest,
                      ),
                    ),
                ] else if (discovery.isEmpty)
                  const _EmptyAllKitchensState()
                else
                  ...discovery.map(
                    (kitchen) => _KitchenCard(
                      kitchen: kitchen,
                      isGuest: widget.isGuest,
                    ),
                  ),
                const SizedBox(height: 24),
                Text(
                  'استعراض المطابخ',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'كل المطابخ المتاحة في العبور',
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    setState(() => _searchQuery = value);
                  },
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'ابحث في كل المطابخ',
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
                const SizedBox(height: 12),
                if (allKitchens.isEmpty)
                  _EmptyAllKitchensState(searchQuery: _searchQuery)
                else
                  ...allKitchens.map(
                    (kitchen) => _KitchenCard(
                      kitchen: kitchen,
                      isGuest: widget.isGuest,
                    ),
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
    this.isGuest = false,
  });

  final KitchenSummary kitchen;
  final bool isGuest;

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
                isGuest: isGuest,
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
              'اختر الحي',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              'لم تختر حيًا بعد — نعرض كل المطابخ المتاحة بالأسفل. اختر الحي من أعلى الصفحة لتصفية المطابخ القريبة، أو تابع لقسم «استعراض المطابخ».',
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

class _EmptyAllKitchensState extends StatelessWidget {
  const _EmptyAllKitchensState({
    this.searchQuery = '',
  });

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
              hasSearch ? Icons.search_off_rounded : Icons.storefront_outlined,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              hasSearch
                  ? 'لا توجد نتائج لـ «${searchQuery.trim()}»'
                  : 'لا توجد مطابخ متاحة',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              hasSearch
                  ? 'جرّب اسم مطبخ أو وجبة أخرى ضمن كل المطابخ المتاحة.'
                  : 'لا توجد مطابخ مفتوحة ومعتمدة حاليًا.',
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
