import 'package:flutter/material.dart';

import '../../cart/data/cart_store.dart';
import '../../cart/presentation/cart_screen.dart';
import '../data/customer_discovery_service.dart';

class KitchenDetailsScreen extends StatefulWidget {
  const KitchenDetailsScreen({
    super.key,
    required this.kitchenIdOrSlug,
    required this.title,
  });

  final String kitchenIdOrSlug;
  final String title;

  @override
  State<KitchenDetailsScreen> createState() => _KitchenDetailsScreenState();
}

class _KitchenDetailsScreenState extends State<KitchenDetailsScreen> {
  final _cart = CartStore.instance;
  final _service = const CustomerDiscoveryService();
  late Future<KitchenDetails> _future = _service.loadKitchenDetails(
    kitchenIdOrSlug: widget.kitchenIdOrSlug,
  );

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
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const CartScreen(),
                    ),
                  );
                },
                icon: Badge.count(
                  count: _cart.totalItems,
                  isLabelVisible: _cart.totalItems > 0,
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
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _KitchenDetailsErrorState(
              message: snapshot.error.toString(),
              onRetry: () {
                setState(() {
                  _future = _service.loadKitchenDetails(
                    kitchenIdOrSlug: widget.kitchenIdOrSlug,
                  );
                });
              },
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
                const SizedBox(height: 20),
                Text(
                  'المنيو',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                if (kitchen.menuItems.isEmpty)
                  const _EmptyMenuState()
                else
                  ...kitchen.menuItems.map(
                    (item) => _MenuItemCard(
                      kitchen: kitchen,
                      item: item,
                    ),
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

class _MenuItemCard extends StatelessWidget {
  const _MenuItemCard({
    required this.kitchen,
    required this.item,
  });

  final KitchenDetails kitchen;
  final MenuItemSummary item;

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
                    item.name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Text(
                  '${item.basePrice.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
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

class _KitchenDetailsErrorState extends StatelessWidget {
  const _KitchenDetailsErrorState({
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
                const Icon(Icons.error_outline_rounded, size: 42),
                const SizedBox(height: 14),
                const Text(
                  'تعذر تحميل تفاصيل المطبخ',
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

  @override
  Widget build(BuildContext context) {
    final selectedSize = widget.item.sizes.where((size) => size.id == _selectedSizeId).firstOrNull;
    final unitPrice = selectedSize?.price ?? widget.item.basePrice;
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
                      label: Text('${size.sizeName} - ${size.price.toStringAsFixed(0)} ج.م'),
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
    final unitPrice = selectedSize?.price ?? widget.item.basePrice;
    final depositAmount = selectedSize?.depositAmount ?? widget.item.depositAmount;

    try {
      CartStore.instance.addItem(
        kitchenId: widget.kitchen.id,
        kitchenName: widget.kitchen.kitchenName,
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString()),
        ),
      );
    }
  }
}
