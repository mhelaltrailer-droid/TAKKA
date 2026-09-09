import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../theme/app_theme.dart';

class PromoSlide {
  const PromoSlide({
    required this.id,
    required this.title,
    this.subtitle,
    required this.imageUrl,
    this.priceLabel,
    this.oldPriceLabel,
  });

  factory PromoSlide.fromJson(Map<String, dynamic> json) {
    return PromoSlide(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      subtitle: json['subtitle']?.toString(),
      imageUrl: json['imageUrl']?.toString() ?? '',
      priceLabel: json['priceLabel']?.toString(),
      oldPriceLabel: json['oldPriceLabel']?.toString(),
    );
  }

  final String id;
  final String title;
  final String? subtitle;
  final String imageUrl;
  final String? priceLabel;
  final String? oldPriceLabel;
}

/// Temporary defaults if API is unavailable.
const List<PromoSlide> defaultPromoSlides = [
  PromoSlide(
    id: 'default-1',
    title: 'صينية بيتية',
    subtitle: 'فراخ مشوية ومحاشي ورز',
    imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    priceLabel: '١٥٩ جنيه',
    oldPriceLabel: '٣٦٠',
  ),
  PromoSlide(
    id: 'default-2',
    title: 'كيك شوكولاتة',
    subtitle: 'حلى منزلي طازج',
    imageUrl:
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
    priceLabel: '١٤٠ جنيه',
    oldPriceLabel: '١٧٠',
  ),
  PromoSlide(
    id: 'default-3',
    title: 'محاشي مشكل',
    subtitle: 'وصفات بيتية من مطابخ العبور',
    imageUrl:
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    priceLabel: '١٩٩ جنيه',
    oldPriceLabel: '٢٨٠',
  ),
];

Future<List<PromoSlide>> loadPromoSlides() async {
  try {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;
    final response = await http.get(Uri.parse('$base/api/discovery/promos'));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return defaultPromoSlides;
    }
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final banners = (json['banners'] as List<dynamic>? ?? const [])
        .map((item) => PromoSlide.fromJson(item as Map<String, dynamic>))
        .where((item) => item.imageUrl.isNotEmpty)
        .toList();
    return banners.isEmpty ? defaultPromoSlides : banners;
  } catch (_) {
    return defaultPromoSlides;
  }
}

class PromoCarousel extends StatefulWidget {
  const PromoCarousel({
    super.key,
    required this.slides,
    this.interval = const Duration(seconds: 4),
  });

  final List<PromoSlide> slides;
  final Duration interval;

  @override
  State<PromoCarousel> createState() => _PromoCarouselState();
}

class _PromoCarouselState extends State<PromoCarousel> {
  late final PageController _controller;
  Timer? _timer;
  var _index = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.92);
    _startAutoPlay();
  }

  @override
  void didUpdateWidget(covariant PromoCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.slides.length != widget.slides.length) {
      _startAutoPlay();
    }
  }

  void _startAutoPlay() {
    _timer?.cancel();
    if (widget.slides.length <= 1) {
      return;
    }
    _timer = Timer.periodic(widget.interval, (_) {
      if (!mounted || !_controller.hasClients) {
        return;
      }
      final next = (_index + 1) % widget.slides.length;
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.slides.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        SizedBox(
          height: 190,
          child: PageView.builder(
            controller: _controller,
            itemCount: widget.slides.length,
            onPageChanged: (value) => setState(() => _index = value),
            itemBuilder: (context, index) {
              final slide = widget.slides[index];
              return Padding(
                padding: const EdgeInsetsDirectional.only(end: 10),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(26),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        slide.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          color: TakkaColors.deep,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.restaurant_rounded,
                            color: Colors.white70,
                            size: 42,
                          ),
                        ),
                      ),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Color(0xCC1F1410),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 16,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              slide.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 18,
                              ),
                            ),
                            if (slide.subtitle != null &&
                                slide.subtitle!.isNotEmpty)
                              Text(
                                slide.subtitle!,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                ),
                              ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                if (slide.priceLabel != null)
                                  Text(
                                    slide.priceLabel!,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                    ),
                                  ),
                                if (slide.oldPriceLabel != null) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    'بدل ${slide.oldPriceLabel}',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.7),
                                      decoration: TextDecoration.lineThrough,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (widget.slides.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.slides.length, (dotIndex) {
              final active = dotIndex == _index;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                height: 8,
                width: active ? 22 : 8,
                decoration: BoxDecoration(
                  color: active ? TakkaColors.primary : TakkaColors.softLine,
                  borderRadius: BorderRadius.circular(99),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}
