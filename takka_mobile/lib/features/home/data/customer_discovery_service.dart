import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/analytics/browse_session.dart';
import '../../../core/config/app_config.dart';

class CustomerDiscoveryService {
  const CustomerDiscoveryService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  /// Best-effort wake for Render free-tier cold starts before heavy GETs.
  Future<void> _wakeApi() async {
    try {
      await http
          .get(_buildUri('/api/health'))
          .timeout(const Duration(seconds: 45));
    } catch (_) {
      // Ignore — the real request will surface a clearer error.
    }
  }

  Future<http.Response> _getWithRetry(
    Uri uri, {
    Map<String, String>? headers,
    int attempts = 3,
    Duration timeout = const Duration(seconds: 45),
  }) async {
    Object? lastError;
    for (var i = 0; i < attempts; i++) {
      try {
        if (i > 0) {
          await Future<void>.delayed(Duration(milliseconds: 700 * i));
          await _wakeApi();
        }
        final response = await http
            .get(uri, headers: headers)
            .timeout(timeout);
        // Render cold start / proxy often returns 502/503 while waking.
        if (response.statusCode == 502 ||
            response.statusCode == 503 ||
            response.statusCode == 504) {
          lastError = Exception('الخادم يستيقظ، أعد المحاولة.');
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? Exception('تعذر الاتصال بالخادم.');
  }

  bool _looksLikeHtml(String body) {
    final trimmed = body.trimLeft().toLowerCase();
    return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
  }

  Future<MobileAppUser> loadMe({
    required String sessionToken,
  }) async {
    final meResponse = await http
        .get(
          _buildUri('/api/mobile/me'),
          headers: {
            'Authorization': 'Bearer $sessionToken',
          },
        )
        .timeout(const Duration(seconds: 25));

    if (meResponse.statusCode < 200 || meResponse.statusCode >= 300) {
      throw Exception('Failed to load user profile: ${meResponse.body}');
    }

    final meJson = jsonDecode(meResponse.body) as Map<String, dynamic>;
    return MobileAppUser.fromJson(meJson['user'] as Map<String, dynamic>);
  }

  Future<CustomerBootstrapData> loadBootstrap({
    String? sessionToken,
    String? regionName,
    String? query,
  }) async {
    MobileAppUser user = const MobileAppUser(
      userId: '',
      appUserId: '',
      fullName: 'مستخدم تكة',
      role: 'customer',
      email: null,
      phoneNumber: null,
      hasKitchen: false,
    );

    final token = sessionToken?.trim() ?? '';
    if (token.isNotEmpty) {
      try {
        user = await loadMe(sessionToken: token);
      } catch (_) {
        // Keep browsing kitchens even if profile sync is slow/unavailable.
      }
    } else {
      // Guest / first open: nudge Render awake before kitchens fetch.
      await _wakeApi();
    }

    // Prefer lean feed; fall back to legacy city list for older backends.
    try {
      final page = await loadKitchenFeed(
        sessionToken: token.isEmpty ? null : token,
        regionName: regionName,
        query: query,
        limit: 50,
      );
      return CustomerBootstrapData(
        user: user,
        kitchens: page.items,
      );
    } catch (_) {
      final kitchens = await loadNearbyKitchensLegacy(
        sessionToken: token.isEmpty ? null : token,
        regionName: regionName,
        query: query,
      );
      return CustomerBootstrapData(
        user: user,
        kitchens: kitchens,
      );
    }
  }

  /// Lean paginated discovery feed (server-side filters + top dishes).
  Future<KitchenFeedPage> loadKitchenFeed({
    String? sessionToken,
    String? regionId,
    String? regionName,
    List<String>? regionNames,
    String? category,
    String? query,
    String? cursor,
    int limit = 20,
  }) async {
    final params = <String, String>{
      'cityName': 'مدينة العبور',
      'limit': '$limit',
    };
    if (regionId != null && regionId.trim().isNotEmpty) {
      params['regionId'] = regionId.trim();
    }
    if (regionName != null && regionName.trim().isNotEmpty) {
      params['regionName'] = regionName.trim();
    }
    final names = regionNames
            ?.map((name) => name.trim())
            .where((name) => name.isNotEmpty)
            .toList() ??
        const <String>[];
    if (names.isNotEmpty) {
      params['regionNames'] = names.join(',');
    }
    if (category != null && category.trim().isNotEmpty) {
      params['category'] = category.trim();
    }
    if (query != null && query.trim().isNotEmpty) {
      params['q'] = query.trim();
    }
    if (cursor != null && cursor.trim().isNotEmpty) {
      params['cursor'] = cursor.trim();
    }

    final headers = <String, String>{};
    final token = sessionToken?.trim() ?? '';
    if (token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final response = await _getWithRetry(
      _buildUri('/api/discovery/kitchens/feed').replace(queryParameters: params),
      headers: headers,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'تعذر تحميل المطابخ الآن. أعد المحاولة بعد لحظات.',
      );
    }

    if (_looksLikeHtml(response.body)) {
      throw Exception(
        'تعذر تحميل المطابخ (استجابة غير صالحة من الخادم). تحقق من رابط الـ API.',
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return KitchenFeedPage.fromJson(json);
  }

  /// Legacy full list — kept for older APKs / feed fallback.
  Future<List<KitchenSummary>> loadNearbyKitchens({
    String? sessionToken,
    String? regionName,
    String? query,
  }) =>
      loadNearbyKitchensLegacy(
        sessionToken: sessionToken,
        regionName: regionName,
        query: query,
      );

  Future<List<KitchenSummary>> loadNearbyKitchensLegacy({
    String? sessionToken,
    String? regionName,
    String? query,
  }) async {
    final params = <String, String>{
      'cityName': 'مدينة العبور',
    };
    if (regionName != null && regionName.trim().isNotEmpty) {
      params['regionName'] = regionName.trim();
    }
    if (query != null && query.trim().isNotEmpty) {
      params['q'] = query.trim();
    }

    final headers = <String, String>{};
    final token = sessionToken?.trim() ?? '';
    if (token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final kitchensResponse = await _getWithRetry(
      _buildUri('/api/discovery/kitchens').replace(queryParameters: params),
      headers: headers,
    );

    if (kitchensResponse.statusCode < 200 ||
        kitchensResponse.statusCode >= 300) {
      throw Exception(
        'تعذر تحميل المطابخ الآن. أعد المحاولة بعد لحظات.',
      );
    }

    if (_looksLikeHtml(kitchensResponse.body)) {
      throw Exception(
        'تعذر تحميل المطابخ (استجابة غير صالحة من الخادم). تحقق من رابط الـ API.',
      );
    }

    final kitchensJson =
        jsonDecode(kitchensResponse.body) as Map<String, dynamic>;

    return (kitchensJson['kitchens'] as List<dynamic>)
        .map((item) => KitchenSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<KitchenDetails> loadKitchenDetails({
    required String kitchenIdOrSlug,
  }) async {
    final response = await http
        .get(
          _buildUri('/api/discovery/kitchens/$kitchenIdOrSlug'),
        )
        .timeout(const Duration(seconds: 25));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load kitchen details: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return KitchenDetails.fromJson(json['kitchen'] as Map<String, dynamic>);
  }

  /// Best-effort kitchen view tracking (guest or signed-in).
  Future<void> recordKitchenView({
    required String kitchenIdOrSlug,
    String? sessionToken,
  }) async {
    try {
      final sessionKey = await getOrCreateBrowseSessionKey();
      final headers = <String, String>{
        'Content-Type': 'application/json',
      };
      final token = sessionToken?.trim() ?? '';
      if (token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
      await http
          .post(
            _buildUri('/api/discovery/kitchens/$kitchenIdOrSlug/view'),
            headers: headers,
            body: jsonEncode({'sessionKey': sessionKey}),
          )
          .timeout(const Duration(seconds: 12));
    } catch (_) {
      // Never block browsing on analytics failures.
    }
  }

  Future<NearbyDealsData> loadNearbyDeals({
    String? regionName,
  }) async {
    final params = <String, String>{
      'cityName': 'مدينة العبور',
    };
    if (regionName != null && regionName.trim().isNotEmpty) {
      params['regionName'] = regionName.trim();
    }

    final response = await http
        .get(
          _buildUri('/api/discovery/deals').replace(queryParameters: params),
        )
        .timeout(const Duration(seconds: 25));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load deals: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return NearbyDealsData.fromJson(json);
  }
}

class CustomerBootstrapData {
  const CustomerBootstrapData({
    required this.user,
    required this.kitchens,
  });

  final MobileAppUser user;
  final List<KitchenSummary> kitchens;
}

class KitchenFeedPage {
  const KitchenFeedPage({
    required this.items,
    required this.nextCursor,
    required this.hasMore,
  });

  factory KitchenFeedPage.fromJson(Map<String, dynamic> json) {
    return KitchenFeedPage(
      items: (json['items'] as List<dynamic>? ?? const [])
          .map((item) => KitchenSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
      nextCursor: json['nextCursor']?.toString(),
      hasMore: json['hasMore'] == true,
    );
  }

  final List<KitchenSummary> items;
  final String? nextCursor;
  final bool hasMore;
}

class MobileAppUser {
  const MobileAppUser({
    required this.userId,
    required this.appUserId,
    required this.fullName,
    required this.role,
    required this.email,
    required this.phoneNumber,
    this.hasKitchen = false,
  });

  factory MobileAppUser.fromJson(Map<String, dynamic> json) {
    return MobileAppUser(
      userId: json['userId']?.toString() ?? '',
      appUserId: json['appUserId']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? 'مستخدم تكة',
      role: json['role']?.toString() ?? 'customer',
      email: json['email']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      hasKitchen: json['hasKitchen'] == true,
    );
  }

  final String userId;
  final String appUserId;
  final String fullName;
  final String role;
  final String? email;
  final String? phoneNumber;
  final bool hasKitchen;
}

class KitchenSummary {
  const KitchenSummary({
    required this.id,
    required this.slug,
    required this.kitchenName,
    required this.description,
    required this.logoUrl,
    required this.coverImageUrl,
    required this.cityName,
    required this.regionName,
    required this.averageRating,
    required this.reviewsCount,
    required this.menuItemsCount,
    required this.menuItemNames,
    required this.menuItemCategoryIds,
    required this.availabilityStatus,
  });

  factory KitchenSummary.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};
    final menuItemNames = (json['menuItemNames'] as List<dynamic>? ?? const [])
        .map((item) => item.toString())
        .where((name) => name.isNotEmpty)
        .toList();
    final menuItemCategoryIds =
        (json['menuItemCategoryIds'] as List<dynamic>? ?? const [])
            .map((item) => item.toString())
            .where((id) => id.isNotEmpty)
            .toList();
    final matchingDishes =
        (json['matchingDishes'] as List<dynamic>? ?? const [])
            .map((item) {
              if (item is Map<String, dynamic>) {
                return item['name']?.toString() ?? '';
              }
              return '';
            })
            .where((name) => name.isNotEmpty)
            .toList();
    final displayNames =
        matchingDishes.isNotEmpty ? matchingDishes : menuItemNames;

    return KitchenSummary(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      kitchenName: json['kitchenName']?.toString() ?? 'مطبخ',
      description: json['description']?.toString(),
      logoUrl: json['logoUrl']?.toString(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      cityName: region['cityName']?.toString() ??
          json['cityName']?.toString() ??
          '',
      regionName: region['regionName']?.toString() ?? '',
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
      reviewsCount: (json['reviewsCount'] as num?)?.toInt() ?? 0,
      menuItemsCount: (json['menuItemsCount'] as num?)?.toInt() ?? 0,
      menuItemNames: displayNames,
      menuItemCategoryIds: menuItemCategoryIds,
      availabilityStatus: json['availabilityStatus']?.toString() ?? 'OPEN',
    );
  }

  final String id;
  final String slug;
  final String kitchenName;
  final String? description;
  final String? logoUrl;
  final String? coverImageUrl;
  final String cityName;
  final String regionName;
  final double averageRating;
  final int reviewsCount;
  final int menuItemsCount;
  final List<String> menuItemNames;
  final List<String> menuItemCategoryIds;
  final String availabilityStatus;

  bool get isBusy => availabilityStatus == 'BUSY';
  bool get isOpen => availabilityStatus == 'OPEN';
}

class KitchenDetails {
  const KitchenDetails({
    required this.id,
    required this.slug,
    required this.kitchenName,
    required this.description,
    required this.logoUrl,
    required this.coverImageUrl,
    required this.addressLine,
    required this.cityName,
    required this.regionName,
    required this.latitude,
    required this.longitude,
    required this.averageRating,
    required this.reviewsCount,
    required this.availabilityStatus,
    required this.menuItems,
    required this.reviews,
    required this.dishOfTheDay,
    required this.activeFlashOffer,
  });

  factory KitchenDetails.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};
    final dishRaw = json['dishOfTheDay'];
    final flashRaw = json['activeFlashOffer'];

    return KitchenDetails(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      kitchenName: json['kitchenName']?.toString() ?? 'مطبخ',
      description: json['description']?.toString(),
      logoUrl: json['logoUrl']?.toString(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      addressLine: json['addressLine']?.toString() ?? '',
      cityName: json['cityName']?.toString() ?? '',
      regionName: region['regionName']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
      reviewsCount: (json['reviewsCount'] as num?)?.toInt() ?? 0,
      availabilityStatus: json['availabilityStatus']?.toString() ?? 'OPEN',
      menuItems: (json['menuItems'] as List<dynamic>? ?? const [])
          .map((item) => MenuItemSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
      reviews: (json['reviews'] as List<dynamic>? ?? const [])
          .map((item) => KitchenReview.fromJson(item as Map<String, dynamic>))
          .toList(),
      dishOfTheDay: dishRaw is Map<String, dynamic>
          ? DealDishOfTheDay.fromJson(dishRaw)
          : null,
      activeFlashOffer: flashRaw is Map<String, dynamic>
          ? DealFlashOffer.fromJson(flashRaw)
          : null,
    );
  }

  final String id;
  final String slug;
  final String kitchenName;
  final String? description;
  final String? logoUrl;
  final String? coverImageUrl;
  final String addressLine;
  final String cityName;
  final String regionName;
  final double? latitude;
  final double? longitude;
  final double averageRating;
  final int reviewsCount;
  final String availabilityStatus;
  final List<MenuItemSummary> menuItems;

  bool get isOpen => availabilityStatus == 'OPEN';
  bool get isBusy => availabilityStatus == 'BUSY';

  /// Matches the web banners in admin/src/lib/kitchen-order-rules.ts.
  String? get availabilityBanner {
    if (isBusy) {
      return 'المطبخ مشغول دلوقتي ومش بيستقبل طلبات. تقدر تشوف المنيو والتقييمات وترجع تطلب لما يفضى.';
    }
    if (!isOpen) {
      return 'المطبخ مقفول دلوقتي ومش بيستقبل طلبات. تقدر تشوف المنيو والتقييمات وترجع تطلب لما يفتح.';
    }
    return null;
  }

  final List<KitchenReview> reviews;
  final DealDishOfTheDay? dishOfTheDay;
  final DealFlashOffer? activeFlashOffer;
}

class MenuItemSummary {
  const MenuItemSummary({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.basePrice,
    required this.discountedPrice,
    required this.depositAmount,
    required this.orderReadiness,
    required this.sizes,
    required this.isDishOfTheDay,
    required this.dishOfTheDayPrice,
    required this.dishOfTheDayQty,
  });

  factory MenuItemSummary.fromJson(Map<String, dynamic> json) {
    return MenuItemSummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'صنف',
      description: json['description']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      discountedPrice:
          double.tryParse(json['discountedPrice']?.toString() ?? ''),
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      orderReadiness:
          json['orderReadiness']?.toString() ?? 'AVAILABLE_NOW',
      sizes: (json['sizes'] as List<dynamic>? ?? const [])
          .map((item) => MenuItemSizeSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
      isDishOfTheDay: json['isDishOfTheDay'] == true,
      dishOfTheDayPrice:
          double.tryParse(json['dishOfTheDayPrice']?.toString() ?? ''),
      dishOfTheDayQty: (json['dishOfTheDayQty'] as num?)?.toInt(),
    );
  }

  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final double basePrice;
  final double? discountedPrice;
  final double depositAmount;
  final String orderReadiness;
  final List<MenuItemSizeSummary> sizes;
  final bool isDishOfTheDay;
  final double? dishOfTheDayPrice;
  final int? dishOfTheDayQty;

  double get catalogPrice {
    final discounted = discountedPrice;
    if (discounted != null && discounted > 0 && discounted < basePrice) {
      return discounted;
    }
    return basePrice;
  }
}

class MenuItemSizeSummary {
  const MenuItemSizeSummary({
    required this.id,
    required this.sizeName,
    required this.price,
    required this.discountedPrice,
    required this.depositAmount,
  });

  factory MenuItemSizeSummary.fromJson(Map<String, dynamic> json) {
    return MenuItemSizeSummary(
      id: json['id']?.toString() ?? '',
      sizeName: json['sizeName']?.toString() ?? '',
      price: double.tryParse(json['price']?.toString() ?? '') ?? 0,
      discountedPrice:
          double.tryParse(json['discountedPrice']?.toString() ?? ''),
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? ''),
    );
  }

  final String id;
  final String sizeName;
  final double price;
  final double? discountedPrice;
  final double? depositAmount;

  double get catalogPrice {
    final discounted = discountedPrice;
    if (discounted != null && discounted > 0 && discounted < price) {
      return discounted;
    }
    return price;
  }
}

class KitchenReview {
  const KitchenReview({
    required this.id,
    required this.ratingValue,
    required this.comment,
    required this.customerName,
  });

  factory KitchenReview.fromJson(Map<String, dynamic> json) {
    final customer = (json['customer'] as Map<String, dynamic>?) ?? const {};

    return KitchenReview(
      id: json['id']?.toString() ?? '',
      ratingValue: (json['ratingValue'] as num?)?.toInt() ?? 0,
      comment: json['comment']?.toString(),
      customerName: customer['fullName']?.toString() ?? 'عميل',
    );
  }

  final String id;
  final int ratingValue;
  final String? comment;
  final String customerName;
}

class NearbyDealsData {
  const NearbyDealsData({
    required this.dishesOfTheDay,
    required this.flashOffers,
  });

  factory NearbyDealsData.fromJson(Map<String, dynamic> json) {
    return NearbyDealsData(
      dishesOfTheDay: (json['dishesOfTheDay'] as List<dynamic>? ?? const [])
          .map((item) => DealDishOfTheDay.fromJson(item as Map<String, dynamic>))
          .toList(),
      flashOffers: (json['flashOffers'] as List<dynamic>? ?? const [])
          .map((item) => DealFlashOffer.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  final List<DealDishOfTheDay> dishesOfTheDay;
  final List<DealFlashOffer> flashOffers;
}

class DealDishOfTheDay {
  const DealDishOfTheDay({
    required this.menuItemId,
    required this.name,
    required this.basePrice,
    required this.dishOfTheDayPrice,
    required this.dishOfTheDayQty,
    required this.kitchenId,
    required this.kitchenName,
    required this.kitchenSlug,
    required this.regionName,
  });

  factory DealDishOfTheDay.fromJson(Map<String, dynamic> json) {
    return DealDishOfTheDay(
      menuItemId: json['menuItemId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      dishOfTheDayPrice:
          double.tryParse(json['dishOfTheDayPrice']?.toString() ?? '') ?? 0,
      dishOfTheDayQty: (json['dishOfTheDayQty'] as num?)?.toInt(),
      kitchenId: json['kitchenId']?.toString() ?? '',
      kitchenName: json['kitchenName']?.toString(),
      kitchenSlug: json['kitchenSlug']?.toString(),
      regionName: json['regionName']?.toString(),
    );
  }

  final String menuItemId;
  final String name;
  final double basePrice;
  final double dishOfTheDayPrice;
  final int? dishOfTheDayQty;
  final String kitchenId;
  final String? kitchenName;
  final String? kitchenSlug;
  final String? regionName;
}

class DealFlashOffer {
  const DealFlashOffer({
    required this.id,
    required this.menuItemId,
    required this.itemName,
    required this.basePrice,
    required this.offerPrice,
    required this.quantityLeft,
    required this.endsAt,
    required this.kitchenId,
    required this.kitchenName,
    required this.kitchenSlug,
    required this.regionName,
  });

  factory DealFlashOffer.fromJson(Map<String, dynamic> json) {
    return DealFlashOffer(
      id: json['id']?.toString() ?? '',
      menuItemId: json['menuItemId']?.toString() ?? '',
      itemName: json['itemName']?.toString() ?? '',
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      offerPrice: double.tryParse(json['offerPrice']?.toString() ?? '') ?? 0,
      quantityLeft: (json['quantityLeft'] as num?)?.toInt() ?? 0,
      endsAt: DateTime.tryParse(json['endsAt']?.toString() ?? '') ??
          DateTime.now(),
      kitchenId: json['kitchenId']?.toString() ?? '',
      kitchenName: json['kitchenName']?.toString(),
      kitchenSlug: json['kitchenSlug']?.toString(),
      regionName: json['regionName']?.toString(),
    );
  }

  final String id;
  final String menuItemId;
  final String itemName;
  final double basePrice;
  final double offerPrice;
  final int quantityLeft;
  final DateTime endsAt;
  final String kitchenId;
  final String? kitchenName;
  final String? kitchenSlug;
  final String? regionName;
}
