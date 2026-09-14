import 'dart:async';

import 'package:flutter/material.dart';

import '../data/customer_discovery_service.dart';
import 'kitchen_details_screen.dart';

class NearbyDealsStrip extends StatefulWidget {
  const NearbyDealsStrip({super.key, required this.regionName});

  final String regionName;

  @override
  State<NearbyDealsStrip> createState() => _NearbyDealsStripState();
}

class _NearbyDealsStripState extends State<NearbyDealsStrip> {
  final _service = const CustomerDiscoveryService();
  Future<NearbyDealsData>? _future;

  @override
  void initState() {
    super.initState();
    _future = _service.loadNearbyDeals(regionName: widget.regionName);
  }

  @override
  void didUpdateWidget(covariant NearbyDealsStrip oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.regionName != widget.regionName) {
      _future = _service.loadNearbyDeals(regionName: widget.regionName);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<NearbyDealsData>(
      future: _future,
      builder: (context, snapshot) {
        final data = snapshot.data;
        if (data == null ||
            (data.dishesOfTheDay.isEmpty && data.flashOffers.isEmpty)) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'عروض قريبة',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.regionName.isEmpty
                  ? 'طبق اليوم وعروض سريعة من المطابخ المتاحة'
                  : 'طبق اليوم وعروض سريعة في ${widget.regionName}',
              style: const TextStyle(fontSize: 12, height: 1.4),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 168,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  ...data.flashOffers.map(
                    (offer) => _FlashDealCard(
                      offer: offer,
                      onTap: () {
                        if (offer.kitchenSlug == null &&
                            offer.kitchenId.isEmpty) {
                          return;
                        }
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => KitchenDetailsScreen(
                              kitchenIdOrSlug:
                                  offer.kitchenSlug ?? offer.kitchenId,
                              title: offer.kitchenName ?? 'مطبخ',
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  ...data.dishesOfTheDay.map(
                    (dish) => _DishDealCard(
                      dish: dish,
                      onTap: () {
                        if (dish.kitchenSlug == null &&
                            dish.kitchenId.isEmpty) {
                          return;
                        }
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => KitchenDetailsScreen(
                              kitchenIdOrSlug:
                                  dish.kitchenSlug ?? dish.kitchenId,
                              title: dish.kitchenName ?? 'مطبخ',
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        );
      },
    );
  }
}

class _FlashDealCard extends StatefulWidget {
  const _FlashDealCard({required this.offer, required this.onTap});

  final DealFlashOffer offer;
  final VoidCallback onTap;

  @override
  State<_FlashDealCard> createState() => _FlashDealCardState();
}

class _FlashDealCardState extends State<_FlashDealCard> {
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
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          width: 220,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3E8),
            borderRadius: BorderRadius.circular(16),
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
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                widget.offer.itemName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              Text(
                widget.offer.kitchenName ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
              const Spacer(),
              Text(
                '${widget.offer.offerPrice.toStringAsFixed(0)} ج',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF9A3412),
                ),
              ),
              Text(
                '${widget.offer.basePrice.toStringAsFixed(0)} ج',
                style: const TextStyle(
                  fontSize: 11,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DishDealCard extends StatelessWidget {
  const _DishDealCard({required this.dish, required this.onTap});

  final DealDishOfTheDay dish;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          width: 220,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(16),
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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              Text(
                dish.kitchenName ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
              const Spacer(),
              Text(
                '${dish.dishOfTheDayPrice.toStringAsFixed(0)} ج',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF065F46),
                ),
              ),
              Text(
                '${dish.basePrice.toStringAsFixed(0)} ج',
                style: const TextStyle(
                  fontSize: 11,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
