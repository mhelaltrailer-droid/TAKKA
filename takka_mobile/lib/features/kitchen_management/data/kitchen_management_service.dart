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
      String message = 'Failed to create menu item';
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        message = body['error']?.toString() ?? message;
      } catch (_) {
        message = 'Failed to create menu item: ${response.body}';
      }
      throw Exception(message);
    }
  }

  Future<void> updateMenuItem({
    required String sessionToken,
    required Map<String, dynamic> payload,
  }) async {
    final response = await http.put(
      _buildUri('/api/kitchen/menu-items'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(payload),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Failed to update menu item';
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        message = body['error']?.toString() ?? message;
      } catch (_) {
        message = 'Failed to update menu item: ${response.body}';
      }
      throw Exception(message);
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

  Future<KitchenDishOfTheDay?> loadDishOfTheDay({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/kitchen/dish-of-the-day'),
      headers: {'Authorization': 'Bearer $sessionToken'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load dish of the day: ${response.body}');
    }
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final raw = json['dishOfTheDay'];
    if (raw == null) return null;
    return KitchenDishOfTheDay.fromJson(raw as Map<String, dynamic>);
  }

  Future<KitchenDishOfTheDay?> saveDishOfTheDay({
    required String sessionToken,
    required String menuItemId,
    required double dishOfTheDayPrice,
    int? dishOfTheDayQty,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/dish-of-the-day'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'menuItemId': menuItemId,
        'dishOfTheDayPrice': dishOfTheDayPrice,
        'dishOfTheDayQty': dishOfTheDayQty,
      }),
    );
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(json['error']?.toString() ?? 'تعذر حفظ طبق اليوم');
    }
    final raw = json['dishOfTheDay'];
    if (raw == null) return null;
    return KitchenDishOfTheDay.fromJson(raw as Map<String, dynamic>);
  }

  Future<void> clearDishOfTheDay({required String sessionToken}) async {
    final response = await http.post(
      _buildUri('/api/kitchen/dish-of-the-day'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'clear': true}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      throw Exception(json['error']?.toString() ?? 'تعذر إلغاء طبق اليوم');
    }
  }

  Future<KitchenFlashOffer?> loadActiveFlashOffer({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/kitchen/flash-offers'),
      headers: {'Authorization': 'Bearer $sessionToken'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load flash offers: ${response.body}');
    }
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final raw = json['activeFlashOffer'];
    if (raw == null) return null;
    return KitchenFlashOffer.fromJson(raw as Map<String, dynamic>);
  }

  Future<KitchenFlashOffer> createFlashOffer({
    required String sessionToken,
    required String menuItemId,
    required double offerPrice,
    required int quantity,
    required int durationHours,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/flash-offers'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'menuItemId': menuItemId,
        'offerPrice': offerPrice,
        'quantity': quantity,
        'durationHours': durationHours,
      }),
    );
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(json['error']?.toString() ?? 'تعذر إنشاء العرض');
    }
    return KitchenFlashOffer.fromJson(
      json['activeFlashOffer'] as Map<String, dynamic>,
    );
  }

  Future<void> endFlashOffer({
    required String sessionToken,
    required String offerId,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/flash-offers/$offerId/end'),
      headers: {'Authorization': 'Bearer $sessionToken'},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      throw Exception(json['error']?.toString() ?? 'تعذر إنهاء العرض');
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
    required this.nationalIdImageUrl,
    required this.approvalStatus,
    required this.rejectionReason,
  });

  factory KitchenProfileData.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};
    final paymentMethods = (json['paymentMethods'] as List<dynamic>? ?? const []);
    final payment = paymentMethods.isNotEmpty
        ? paymentMethods.first as Map<String, dynamic>
        : const <String, dynamic>{};

    final documents = (json['documents'] as List<dynamic>? ?? const []);
    final nationalIdDoc = documents.isNotEmpty
        ? documents.first as Map<String, dynamic>
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
      nationalIdImageUrl: nationalIdDoc['fileUrl']?.toString(),
      approvalStatus: json['approvalStatus']?.toString() ?? 'PENDING',
      rejectionReason: json['rejectionReason']?.toString(),
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
  final String? nationalIdImageUrl;
  final String approvalStatus;
  final String? rejectionReason;
}

class KitchenManagedMenuItem {
  const KitchenManagedMenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.categoryId,
    required this.orderReadiness,
    required this.basePrice,
    required this.depositAmount,
    required this.isAvailable,
    required this.approvalStatus,
    required this.rejectionReason,
    required this.draftStatus,
    required this.draftRejectionReason,
    required this.isDishOfTheDay,
  });

  factory KitchenManagedMenuItem.fromJson(Map<String, dynamic> json) {
    return KitchenManagedMenuItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      categoryId: json['categoryId']?.toString() ?? 'meals',
      orderReadiness:
          json['orderReadiness']?.toString() ?? 'AVAILABLE_NOW',
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      isAvailable: json['isAvailable'] == true,
      approvalStatus: json['approvalStatus']?.toString() ?? 'APPROVED',
      rejectionReason: json['rejectionReason']?.toString(),
      draftStatus: json['draftStatus']?.toString(),
      draftRejectionReason: json['draftRejectionReason']?.toString(),
      isDishOfTheDay: json['isDishOfTheDay'] == true,
    );
  }

  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String categoryId;
  final String orderReadiness;
  final double basePrice;
  final double depositAmount;
  final bool isAvailable;
  final String approvalStatus;
  final String? rejectionReason;
  final String? draftStatus;
  final String? draftRejectionReason;
  final bool isDishOfTheDay;
}

class KitchenDishOfTheDay {
  const KitchenDishOfTheDay({
    required this.menuItemId,
    required this.name,
    required this.basePrice,
    required this.dishOfTheDayPrice,
    required this.dishOfTheDayQty,
  });

  factory KitchenDishOfTheDay.fromJson(Map<String, dynamic> json) {
    return KitchenDishOfTheDay(
      menuItemId: json['menuItemId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      dishOfTheDayPrice:
          double.tryParse(json['dishOfTheDayPrice']?.toString() ?? '') ?? 0,
      dishOfTheDayQty: (json['dishOfTheDayQty'] as num?)?.toInt(),
    );
  }

  final String menuItemId;
  final String name;
  final double basePrice;
  final double dishOfTheDayPrice;
  final int? dishOfTheDayQty;
}

class KitchenFlashOffer {
  const KitchenFlashOffer({
    required this.id,
    required this.menuItemId,
    required this.itemName,
    required this.basePrice,
    required this.offerPrice,
    required this.quantityLeft,
    required this.endsAt,
  });

  factory KitchenFlashOffer.fromJson(Map<String, dynamic> json) {
    return KitchenFlashOffer(
      id: json['id']?.toString() ?? '',
      menuItemId: json['menuItemId']?.toString() ?? '',
      itemName: json['itemName']?.toString() ?? '',
      basePrice: double.tryParse(json['basePrice']?.toString() ?? '') ?? 0,
      offerPrice: double.tryParse(json['offerPrice']?.toString() ?? '') ?? 0,
      quantityLeft: (json['quantityLeft'] as num?)?.toInt() ?? 0,
      endsAt: DateTime.tryParse(json['endsAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  final String id;
  final String menuItemId;
  final String itemName;
  final double basePrice;
  final double offerPrice;
  final int quantityLeft;
  final DateTime endsAt;
}
