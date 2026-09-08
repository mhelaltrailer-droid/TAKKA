import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';

class CustomerDiscoveryService {
  const CustomerDiscoveryService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<CustomerBootstrapData> loadBootstrap({
    required String sessionToken,
  }) async {
    final meResponse = await http.get(
      _buildUri('/api/mobile/me'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (meResponse.statusCode < 200 || meResponse.statusCode >= 300) {
      throw Exception('Failed to load user profile: ${meResponse.body}');
    }

    final kitchensResponse = await http.get(
      _buildUri('/api/discovery/kitchens'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (kitchensResponse.statusCode < 200 || kitchensResponse.statusCode >= 300) {
      throw Exception('Failed to load kitchens: ${kitchensResponse.body}');
    }

    final meJson = jsonDecode(meResponse.body) as Map<String, dynamic>;
    final kitchensJson = jsonDecode(kitchensResponse.body) as Map<String, dynamic>;

    return CustomerBootstrapData(
      user: MobileAppUser.fromJson(meJson['user'] as Map<String, dynamic>),
      kitchens: (kitchensJson['kitchens'] as List<dynamic>)
          .map((item) => KitchenSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<KitchenDetails> loadKitchenDetails({
    required String kitchenIdOrSlug,
  }) async {
    final response = await http.get(
      _buildUri('/api/discovery/kitchens/$kitchenIdOrSlug'),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load kitchen details: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return KitchenDetails.fromJson(json['kitchen'] as Map<String, dynamic>);
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

class MobileAppUser {
  const MobileAppUser({
    required this.userId,
    required this.appUserId,
    required this.fullName,
    required this.role,
    required this.email,
  });

  factory MobileAppUser.fromJson(Map<String, dynamic> json) {
    return MobileAppUser(
      userId: json['userId']?.toString() ?? '',
      appUserId: json['appUserId']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? 'مستخدم تكة',
      role: json['role']?.toString() ?? 'customer',
      email: json['email']?.toString(),
    );
  }

  final String userId;
  final String appUserId;
  final String fullName;
  final String role;
  final String? email;
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
  });

  factory KitchenSummary.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};

    return KitchenSummary(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      kitchenName: json['kitchenName']?.toString() ?? 'مطبخ',
      description: json['description']?.toString(),
      logoUrl: json['logoUrl']?.toString(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      cityName: json['cityName']?.toString() ?? '',
      regionName: region['regionName']?.toString() ?? '',
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
      reviewsCount: (json['reviewsCount'] as num?)?.toInt() ?? 0,
      menuItemsCount: (json['menuItemsCount'] as num?)?.toInt() ?? 0,
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
    required this.averageRating,
    required this.reviewsCount,
    required this.menuItems,
    required this.reviews,
  });

  factory KitchenDetails.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};

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
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
      reviewsCount: (json['reviewsCount'] as num?)?.toInt() ?? 0,
      menuItems: (json['menuItems'] as List<dynamic>? ?? const [])
          .map((item) => MenuItemSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
      reviews: (json['reviews'] as List<dynamic>? ?? const [])
          .map((item) => KitchenReview.fromJson(item as Map<String, dynamic>))
          .toList(),
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
  final double averageRating;
  final int reviewsCount;
  final List<MenuItemSummary> menuItems;
  final List<KitchenReview> reviews;
}

class MenuItemSummary {
  const MenuItemSummary({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.basePrice,
    required this.depositAmount,
    required this.sizes,
  });

  factory MenuItemSummary.fromJson(Map<String, dynamic> json) {
    return MenuItemSummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'صنف',
      description: json['description']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      sizes: (json['sizes'] as List<dynamic>? ?? const [])
          .map((item) => MenuItemSizeSummary.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final double basePrice;
  final double depositAmount;
  final List<MenuItemSizeSummary> sizes;
}

class MenuItemSizeSummary {
  const MenuItemSizeSummary({
    required this.id,
    required this.sizeName,
    required this.price,
    required this.depositAmount,
  });

  factory MenuItemSizeSummary.fromJson(Map<String, dynamic> json) {
    return MenuItemSizeSummary(
      id: json['id']?.toString() ?? '',
      sizeName: json['sizeName']?.toString() ?? '',
      price: double.tryParse(json['price']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? ''),
    );
  }

  final String id;
  final String sizeName;
  final double price;
  final double? depositAmount;
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
