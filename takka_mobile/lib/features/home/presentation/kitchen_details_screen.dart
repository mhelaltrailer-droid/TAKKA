import 'dart:async';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/location/kitchen_location_actions.dart';
import '../../../core/orders/order_readiness.dart';
import '../../../core/ui/friendly_error.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../../auth/presentation/guest_sign_up_prompt.dart';
import '../../cart/data/cart_store.dart';
import '../../cart/presentation/cart_screen.dart';
import '../data/customer_discovery_service.dart';

class _FlashCountdownLabel extends StatefulWidget {
  const _FlashCountdownLabel({required this.endsAt});

  final DateTime endsAt;

  @override
  State<_FlashCountdownLabel> createState() => _FlashCountdownLabelState();
}

class _FlashCountdownLabelState extends State<_FlashCountdownLabel> {
  Timer? _timer;
  Duration _left = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final left = widget.endsAt.difference(DateTime.now());
    if (!mounted) return;
    setState(() {
      _left = left.isNegative ? Duration.zero : left;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = _left;
    final label = d.inSeconds <= 0
        ? 'انتهى'
        : d.inHours > 0
            ? '${d.inHours}:${d.inMinutes.remainder(60).toString().padLeft(2, '0')}:${d.inSeconds.remainder(60).toString().padLeft(2, '0')}'
            : '${d.inMinutes.remainder(60).toString().padLeft(2, '0')}:${d.inSeconds.remainder(60).toString().padLeft(2, '0')}';
    return Text(
      'ينتهي خلال $label',
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Color(0xFF9A3412),
      ),
    );
  }
}

class KitchenDetailsScreen extends StatefulWidget {
  const KitchenDetailsScreen({
    super.key,
    required this.kitchenIdOrSlug,
    required this.title,
    this.isGuest = false,
  });

  final String kitchenIdOrSlug;
  final String title;
  final bool isGuest;

  @override
  State<KitchenDetailsScreen> createState() => _KitchenDetailsScreenState();
}

class _KitchenDetailsScreenState extends State<KitchenDetailsScreen> {
  final _cart = CartStore.instance;
  final _service = const CustomerDiscoveryService();
  late Future<KitchenDetails> _future = _loadDetails();
  var _viewRecorded = false;

  Future<KitchenDetails> _loadDetails() async {
    final details = await _service.loadKitchenDetails(
      kitchenIdOrSlug: widget.kitchenIdOrSlug,
    );
    if (!_viewRecorded && mounted) {
      _viewRecorded = true;
      String? token;
      if (!widget.isGuest) {
        try {
          final authState = ClerkAuth.of(context, listen: false);
          final session = await authState.sessionToken();
          token = session.jwt;
        } catch (_) {}
      }
      unawaited(
        _service.recordKitchenView(
          kitchenIdOrSlug: details.id.isNotEmpty
              ? details.id
              : widget.kitchenIdOrSlug,
          sessionToken: token,
        ),
      );
    }
    return details;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          ListenableBuilder(
            listenable: _cart,
            builder: (context, _) {
              return IconButton(
                onPressed: () {
                  if (widget.isGuest) {
                    showGuestSignUpPrompt(context);
                    return;
                  }
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const CartScreen(),
                    ),
                  );
                },
                icon: Badge.count(
                  count: _cart.totalItems,
                  isLabelVisible: !widget.isGuest && _cart.totalItems > 0,
                  child: const Icon(Icons.shopping_cart_outlined),
                ),
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<KitchenDetails>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const DetailScreenSkeleton();
          }

          if (snapshot.hasError) {
            return Center(
              child: TakkaErrorRetry(
                onRetry: () {
                  setState(() {
                    _future = _service.loadKitchenDetails(
                      kitchenIdOrSlug: widget.kitchenIdOrSlug,
                    );
                  });
                },
              ),
            );
          }

          final kitchen = snapshot.data!;

          return RefreshIndicator(
            onRefresh: () async {
              final future = _service.loadKitchenDetails(
                kitchenIdOrSlug: widget.kitchenIdOrSlug,
              );
              setState(() {
                _future = future;
              });
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
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
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: Colors.white.withValues(alpha: 0.16),
                            backgroundImage: kitchen.logoUrl != null
                                ? NetworkImage(kitchen.logoUrl!)
                                : null,
                            child: kitchen.logoUrl == null
                                ? const Icon(
                                    Icons.storefront_outlined,
                                    color: Colors.white,
                                  )
                                : null,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  kitchen.kitchenName,
                                  style: theme.textTheme.headlineSmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${kitchen.cityName} - ${kitchen.regionName}',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: Colors.white.withValues(alpha: 0.88),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (kitchen.description case final description?
                          when description.trim().isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          description,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: Colors.white.withValues(alpha: 0.92),
                            height: 1.6,
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: Colors.amber),
                          const SizedBox(width: 6),
                          Text(
                            '${kitchen.averageRating.toStringAsFixed(1)} (${kitchen.reviewsCount} تقييم)',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        kitchen.addressLine,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.88),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                KitchenLocationActions(
                  latitude: kitchen.latitude,
                  longitude: kitchen.longitude,
                  addressLine: kitchen.addressLine,
                  regionLabel: [
                    kitchen.cityName,
                    kitchen.regionName,
                  ].where((part) => part.trim().isNotEmpty).join(' - '),
                ),
                const SizedBox(height: 20),
                Text(
                  'المنيو',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                Builder(
                  builder: (context) {
                    final displayItems = _menuItemsForCustomer(kitchen);
                    if (displayItems.isEmpty) {
                      return const _EmptyMenuState();
                    }
                    return Column(
                      children: displayItems
                          .map(
                            (item) => _MenuItemCard(
                              kitchen: kitchen,
                              item: item,
                              isGuest: widget.isGuest,
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
                const SizedBox(height: 20),
                Text(
                  'آخر التقييمات',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                if (kitchen.reviews.isEmpty)
                  const _EmptyReviewsState()
                else
                  ...kitchen.reviews.map(
                    (review) => _ReviewCard(review: review),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

List<MenuItemSummary> _menuItemsForCustomer(KitchenDetails kitchen) {
  final byId = <String, MenuItemSummary>{
    for (final item in kitchen.menuItems) item.id: item,
  };

  final dish = kitchen.dishOfTheDay;
  if (dish != null && !byId.containsKey(dish.menuItemId)) {
    byId[dish.menuItemId] = MenuItemSummary(
      id: dish.menuItemId,
      name: dish.name,
      description: null,
      imageUrl: null,
      basePrice: dish.basePrice,
      discountedPrice: null,
      depositAmount: 0,
      orderReadiness: 'AVAILABLE_NOW',
      sizes: const [],
      isDishOfTheDay: true,
      dishOfTheDayPrice: dish.dishOfTheDayPrice,
      dishOfTheDayQty: dish.dishOfTheDayQty,
    );
  }

  final flash = kitchen.activeFlashOffer;
  if (flash != null && !byId.containsKey(flash.menuItemId)) {
    byId[flash.menuItemId] = MenuItemSummary(
      id: flash.menuItemId,
      name: flash.itemName,
      description: null,
      imageUrl: null,
      basePrice: flash.basePrice,
      discountedPrice: null,
      depositAmount: 0,
      orderReadiness: 'AVAILABLE_NOW',
      sizes: const [],
      isDishOfTheDay: false,
      dishOfTheDayPrice: null,
      dishOfTheDayQty: null,
    );
  }

  return byId.values.toList();
}

class _MenuItemCard extends StatelessWidget {
  const _MenuItemCard({
    required this.kitchen,
    required this.item,
    this.isGuest = false,
  });

  final KitchenDetails kitchen;
  final MenuItemSummary item;
  final bool isGuest;

  @override
  Widget build(BuildContext context) {
    final flash = kitchen.activeFlashOffer;
    final isFlash = flash != null && flash.menuItemId == item.id;
    final dish = kitchen.dishOfTheDay;
    final isDish = (item.isDishOfTheDay &&
            item.dishOfTheDayPrice != null &&
            (item.dishOfTheDayQty == null || item.dishOfTheDayQty! > 0)) ||
        (dish != null &&
            dish.menuItemId == item.id &&
            (dish.dishOfTheDayQty == null || dish.dishOfTheDayQty! > 0));
    final dealPrice = isFlash
        ? flash.offerPrice
        : (isDish
            ? (item.dishOfTheDayPrice ?? dish?.dishOfTheDayPrice)
            : null);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (dealPrice != null) ...[
                  Text(
                    '${item.basePrice.toStringAsFixed(0)} ج.م',
                    style: TextStyle(
                      fontSize: 12,
                      decoration: TextDecoration.lineThrough,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${dealPrice.toStringAsFixed(0)} ج.م',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: isFlash
                          ? const Color(0xFF9A3412)
                          : const Color(0xFF065F46),
                    ),
                  ),
                ] else if (item.discountedPrice != null &&
                    item.discountedPrice! > 0 &&
                    item.discountedPrice! < item.basePrice) ...[
                  Text(
                    '${item.basePrice.toStringAsFixed(0)} ج.م',
                    style: TextStyle(
                      fontSize: 12,
                      decoration: TextDecoration.lineThrough,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${item.discountedPrice!.toStringAsFixed(0)} ج.م',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ] else
                  Text(
                    '${item.basePrice.toStringAsFixed(0)} ج.م',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
            if (isFlash || isDish) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  if (isFlash)
                    const Chip(
                      label: Text('عرض سريع'),
                      visualDensity: VisualDensity.compact,
                    ),
                  if (isDish)
                    const Chip(
                      label: Text('طبق اليوم'),
                      visualDensity: VisualDensity.compact,
                    ),
                ],
              ),
            ],
            if (item.description case final description?
                when description.trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                description,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  height: 1.5,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Text(
              'العربون: ${item.depositAmount.toStringAsFixed(0)} ج.م',
              style: TextStyle(
                color: Colors.grey.shade800,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (isFlash) ...[
              const SizedBox(height: 6),
              _FlashCountdownLabel(endsAt: flash.endsAt),
              Text(
                'متبقي من العرض: ${flash.quantityLeft}',
                style: const TextStyle(fontSize: 12),
              ),
            ],
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Text(
                  '$orderReadinessCustomerQuestion ${orderReadinessLabel(item.orderReadiness)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0C4A6E),
                  ),
                ),
              ),
            ),
            if (item.sizes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: item.sizes
                    .map(
                      (size) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F5F4),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '${size.sizeName} - ${size.price.toStringAsFixed(0)} ج.م',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ],
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _openAddToCartSheet(context),
                icon: const Icon(Icons.add_shopping_cart_rounded),
                label: const Text('إضافة للسلة'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openAddToCartSheet(BuildContext context) {
    if (isGuest) {
      showGuestSignUpPrompt(context);
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return _AddToCartSheet(
          kitchen: kitchen,
          item: item,
        );
      },
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({
    required this.review,
  });

  final KitchenReview review;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    review.customerName,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Row(
                  children: List.generate(
                    review.ratingValue,
                    (_) => const Icon(
                      Icons.star_rounded,
                      color: Colors.amber,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
            if (review.comment case final comment? when comment.trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                comment,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyMenuState extends StatelessWidget {
  const _EmptyMenuState();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'لا توجد أصناف متاحة في المنيو حاليًا.',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class _EmptyReviewsState extends StatelessWidget {
  const _EmptyReviewsState();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text(
          'لا توجد تقييمات ظاهرة لهذا المطبخ بعد.',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class _AddToCartSheet extends StatefulWidget {
  const _AddToCartSheet({
    required this.kitchen,
    required this.item,
  });

  final KitchenDetails kitchen;
  final MenuItemSummary item;

  @override
  State<_AddToCartSheet> createState() => _AddToCartSheetState();
}

class _AddToCartSheetState extends State<_AddToCartSheet> {
  final _noteController = TextEditingController();
  int _quantity = 1;
  String? _selectedSizeId;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  double _dealBasePrice() {
    final flash = widget.kitchen.activeFlashOffer;
    if (flash != null && flash.menuItemId == widget.item.id) {
      return flash.offerPrice;
    }
    final dish = widget.kitchen.dishOfTheDay;
    if (dish != null && dish.menuItemId == widget.item.id) {
      return dish.dishOfTheDayPrice;
    }
    if (widget.item.isDishOfTheDay && widget.item.dishOfTheDayPrice != null) {
      return widget.item.dishOfTheDayPrice!;
    }
    return widget.item.catalogPrice;
  }

  @override
  Widget build(BuildContext context) {
    final selectedSize = widget.item.sizes.where((size) => size.id == _selectedSizeId).firstOrNull;
    final unitPrice = selectedSize?.catalogPrice ?? _dealBasePrice();
    final depositAmount = selectedSize?.depositAmount ?? widget.item.depositAmount;

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.item.name,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          if (widget.item.sizes.isNotEmpty) ...[
            const Text(
              'اختر الحجم',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: widget.item.sizes
                  .map(
                    (size) => ChoiceChip(
                      label: Text(
                        size.discountedPrice != null &&
                                size.discountedPrice! > 0 &&
                                size.discountedPrice! < size.price
                            ? '${size.sizeName} - ${size.discountedPrice!.toStringAsFixed(0)} ج.م (كان ${size.price.toStringAsFixed(0)})'
                            : '${size.sizeName} - ${size.price.toStringAsFixed(0)} ج.م',
                      ),
                      selected: _selectedSizeId == size.id,
                      onSelected: (_) {
                        setState(() {
                          _selectedSizeId = size.id;
                        });
                      },
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 14),
          ],
          Row(
            children: [
              const Text(
                'الكمية',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              IconButton(
                onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                icon: const Icon(Icons.remove_circle_outline_rounded),
              ),
              Text(
                _quantity.toString(),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              IconButton(
                onPressed: () => setState(() => _quantity++),
                icon: const Icon(Icons.add_circle_outline_rounded),
              ),
            ],
          ),
          TextField(
            controller: _noteController,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'ملاحظات على الصنف',
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'الإجمالي: ${(unitPrice * _quantity).toStringAsFixed(0)} ج.م',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'إجمالي العربون: ${(depositAmount * _quantity).toStringAsFixed(0)} ج.م',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _addToCart,
              icon: const Icon(Icons.shopping_cart_checkout_rounded),
              label: const Text('إضافة للسلة'),
            ),
          ),
        ],
      ),
    );
  }

  void _addToCart() {
    final selectedSize = widget.item.sizes.where((size) => size.id == _selectedSizeId).firstOrNull;
    final unitPrice = selectedSize?.catalogPrice ?? _dealBasePrice();
    final depositAmount = selectedSize?.depositAmount ?? widget.item.depositAmount;

    try {
      CartStore.instance.addItem(
        kitchenId: widget.kitchen.id,
        kitchenName: widget.kitchen.kitchenName,
        kitchenLatitude: widget.kitchen.latitude,
        kitchenLongitude: widget.kitchen.longitude,
        kitchenAddressLine: widget.kitchen.addressLine,
        kitchenRegionLabel: [
          widget.kitchen.cityName,
          widget.kitchen.regionName,
        ].where((part) => part.trim().isNotEmpty).join(' - '),
        item: CartItem(
          id: '${widget.item.id}-${selectedSize?.id ?? 'base'}-${DateTime.now().microsecondsSinceEpoch}',
          menuItemId: widget.item.id,
          menuItemName: widget.item.name,
          menuItemSizeId: selectedSize?.id,
          sizeName: selectedSize?.sizeName,
          unitPrice: unitPrice,
          depositAmount: depositAmount,
          quantity: _quantity,
          customerNote: _noteController.text.trim().isEmpty
              ? null
              : _noteController.text.trim(),
        ),
      );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تمت إضافة الصنف إلى السلة.'),
        ),
      );
    } on StateError catch (error) {
      showFriendlyError(context, error: error);
    }
  }
}
