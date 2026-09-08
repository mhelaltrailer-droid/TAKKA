import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';

class KitchenManagementService {
  const KitchenManagementService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<KitchenProfileData?> loadProfile({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/kitchen/profile'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load kitchen profile: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (json['kitchen'] == null) {
      return null;
    }

    return KitchenProfileData.fromJson(json['kitchen'] as Map<String, dynamic>);
  }

  Future<void> saveProfile({
    required String sessionToken,
    required Map<String, dynamic> payload,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/profile'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to save kitchen profile: ${response.body}');
    }
  }

  Future<List<KitchenManagedMenuItem>> loadMenuItems({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/kitchen/menu-items'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load kitchen menu: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return (json['menuItems'] as List<dynamic>? ?? const [])
        .map((item) => KitchenManagedMenuItem.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> createMenuItem({
    required String sessionToken,
    required Map<String, dynamic> payload,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/menu-items'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to create menu item: ${response.body}');
    }
  }

  Future<void> updateAvailability({
    required String sessionToken,
    required String menuItemId,
    required bool isAvailable,
  }) async {
    final response = await http.patch(
      _buildUri('/api/kitchen/menu-items/$menuItemId'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'isAvailable': isAvailable,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to update menu item: ${response.body}');
    }
  }

  Future<void> deleteMenuItem({
    required String sessionToken,
    required String menuItemId,
  }) async {
    final response = await http.delete(
      _buildUri('/api/kitchen/menu-items/$menuItemId'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to delete menu item: ${response.body}');
    }
  }
}

class KitchenProfileData {
  const KitchenProfileData({
    required this.kitchenName,
    required this.description,
    required this.phoneNumber,
    required this.cityName,
    required this.regionName,
    required this.addressLine,
    required this.logoUrl,
    required this.coverImageUrl,
    required this.instapayHandle,
    required this.instapayLink,
  });

  factory KitchenProfileData.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};
    final paymentMethods = (json['paymentMethods'] as List<dynamic>? ?? const []);
    final payment = paymentMethods.isNotEmpty
        ? paymentMethods.first as Map<String, dynamic>
        : const <String, dynamic>{};

    return KitchenProfileData(
      kitchenName: json['kitchenName']?.toString() ?? '',
      description: json['description']?.toString(),
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      cityName: json['cityName']?.toString() ?? '',
      regionName: region['regionName']?.toString() ?? '',
      addressLine: json['addressLine']?.toString() ?? '',
      logoUrl: json['logoUrl']?.toString(),
      coverImageUrl: json['coverImageUrl']?.toString(),
      instapayHandle: payment['accountNumberOrHandle']?.toString(),
      instapayLink: payment['paymentLink']?.toString(),
    );
  }

  final String kitchenName;
  final String? description;
  final String phoneNumber;
  final String cityName;
  final String regionName;
  final String addressLine;
  final String? logoUrl;
  final String? coverImageUrl;
  final String? instapayHandle;
  final String? instapayLink;
}

class KitchenManagedMenuItem {
  const KitchenManagedMenuItem({
    required this.id,
    required this.name,
    required this.basePrice,
    required this.depositAmount,
    required this.isAvailable,
  });

  factory KitchenManagedMenuItem.fromJson(Map<String, dynamic> json) {
    return KitchenManagedMenuItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      isAvailable: json['isAvailable'] == true,
    );
  }

  final String id;
  final String name;
  final double basePrice;
  final double depositAmount;
  final bool isAvailable;
}
