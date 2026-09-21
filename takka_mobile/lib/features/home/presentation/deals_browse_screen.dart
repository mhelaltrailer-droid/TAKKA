import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../data/customer_discovery_service.dart';
import 'kitchen_details_screen.dart';

class DealsBrowseScreen extends StatefulWidget {
  const DealsBrowseScreen({super.key, this.embeddedInShell = false});

  final bool embeddedInShell;

  @override
  State<DealsBrowseScreen> createState() => _DealsBrowseScreenState();
}

class _DealsBrowseScreenState extends State<DealsBrowseScreen> {
  final _service = const CustomerDiscoveryService();
  late Future<NearbyDealsData> _future;

  @override
  void initState() {
    super.initState();
    _future = _service.loadNearbyDeals();
  }

  Future<void> _reload() async {
    final next = _service.loadNearbyDeals();
    setState(() => _future = next);
    await next;
  }

  void _openKitchen(String? slug, String kitchenId, String? name) {
    final idOrSlug = (slug != null && slug.isNotEmpty) ? slug : kitchenId;
    if (idOrSlug.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => KitchenDetailsScreen(
          kitchenIdOrSlug: idOrSlug,
          title: name ?? 'مطبخ',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final body = FutureBuilder<NearbyDealsData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: TakkaErrorRetry(onRetry: _reload));
        }

        final data = snapshot.data!;
        final empty =
            data.dishesOfTheDay.isEmpty && data.flashOffers.isEmpty;

        return RefreshIndicator(
          onRefresh: _reload,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              if (!widget.embeddedInShell) ...[
                Text(
                  'العروض',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 6),
              ],
              const Text(
                'كل Flash وأطباق اليوم من مطابخ مدينة العبور المتاحة الآن.',
                style: TextStyle(color: TakkaColors.muted, height: 1.45),
              ),
              const SizedBox(height: 18),
              if (empty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: TakkaColors.softLine),
                  ),
                  child: const Column(
                    children: [
                      Text(
                        'لا توجد عروض الآن',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'رجّع هنا لاحقًا — المطابخ بتضيف طبق اليوم والعروض السريعة على مدار اليوم.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: TakkaColors.muted, height: 1.45),
                      ),
                    ],
                  ),
                ),
              if (data.flashOffers.isNotEmpty) ...[
                const Text(
                  'عروض سريعة (Flash)',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                ...data.flashOffers.map(
                  (offer) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _FlashDealTile(
                      offer: offer,
                      onTap: () => _openKitchen(
                        offer.kitchenSlug,
                        offer.kitchenId,
                        offer.kitchenName,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              if (data.dishesOfTheDay.isNotEmpty) ...[
                const Text(
                  'أطباق اليوم',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                ...data.dishesOfTheDay.map(
                  (dish) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _DishDealTile(
                      dish: dish,
                      onTap: () => _openKitchen(
                        dish.kitchenSlug,
                        dish.kitchenId,
                        dish.kitchenName,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );

    if (widget.embeddedInShell) {
      return SafeArea(child: body);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('العروض')),
      body: body,
    );
  }
}

class _FlashDealTile extends StatefulWidget {
  const _FlashDealTile({required this.offer, required this.onTap});

  final DealFlashOffer offer;
  final VoidCallback onTap;

  @override
  State<_FlashDealTile> createState() => _FlashDealTileState();
}

class _FlashDealTileState extends State<_FlashDealTile> {
  Timer? _timer;
  Duration _left = Duration.zero;

  @override
  void initState() {
    super.initState();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final left = widget.offer.endsAt.difference(DateTime.now());
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

  String _label(Duration d) {
    if (d.inSeconds <= 0) return 'انتهى';
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    if (h > 0) {
      return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFFFF3E8),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFFFD0A8)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFD0A8),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      'عرض سريع',
                      style:
                          TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _label(_left),
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                widget.offer.itemName,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                [
                  widget.offer.kitchenName ?? '',
                  if (widget.offer.regionName != null &&
                      widget.offer.regionName!.isNotEmpty)
                    widget.offer.regionName!,
                ].where((s) => s.isNotEmpty).join(' · '),
                style: const TextStyle(color: TakkaColors.muted, fontSize: 12),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    '${widget.offer.offerPrice.toStringAsFixed(0)} ج',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF9A3412),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${widget.offer.basePrice.toStringAsFixed(0)} ج',
                    style: const TextStyle(
                      decoration: TextDecoration.lineThrough,
                      color: TakkaColors.muted,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'متبقي ${widget.offer.quantityLeft}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF9A3412),
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

class _DishDealTile extends StatelessWidget {
  const _DishDealTile({required this.dish, required this.onTap});

  final DealDishOfTheDay dish;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFECFDF5),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFA7F3D0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFA7F3D0),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'طبق اليوم',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                dish.name,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                [
                  dish.kitchenName ?? '',
                  if (dish.regionName != null && dish.regionName!.isNotEmpty)
                    dish.regionName!,
                ].where((s) => s.isNotEmpty).join(' · '),
                style: const TextStyle(color: TakkaColors.muted, fontSize: 12),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    '${dish.dishOfTheDayPrice.toStringAsFixed(0)} ج',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF065F46),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${dish.basePrice.toStringAsFixed(0)} ج',
                    style: const TextStyle(
                      decoration: TextDecoration.lineThrough,
                      color: TakkaColors.muted,
                    ),
                  ),
                  if (dish.dishOfTheDayQty != null) ...[
                    const Spacer(),
                    Text(
                      'متبقي ${dish.dishOfTheDayQty}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
