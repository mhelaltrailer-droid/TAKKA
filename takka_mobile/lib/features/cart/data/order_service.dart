import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import 'cart_store.dart';

class OrderService {
  const OrderService();

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<List<CustomerAddress>> loadAddresses({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/customer/addresses'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load addresses: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return (json['addresses'] as List<dynamic>? ?? const [])
        .map((item) => CustomerAddress.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<CustomerAddress> createAddress({
    required String sessionToken,
    required String label,
    required String cityName,
    required String regionName,
    required String addressLine,
    String? landmark,
    double? latitude,
    double? longitude,
    bool isDefault = false,
  }) async {
    final response = await http.post(
      _buildUri('/api/customer/addresses'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
      body: jsonEncode({
        'label': label,
        'cityName': cityName,
        'regionName': regionName,
        'addressLine': addressLine,
        'landmark': landmark,
        'latitude': latitude,
        'longitude': longitude,
        'isDefault': isDefault,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to create address: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return CustomerAddress.fromJson(
      json['address'] as Map<String, dynamic>,
    );
  }

  Future<OrderCreationResult> createOrder({
    required String sessionToken,
    required String kitchenId,
    required String deliveryType,
    String? customerAddressId,
    String? customerNotes,
    required List<CartItem> items,
  }) async {
    final response = await http.post(
      _buildUri('/api/orders'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
      body: jsonEncode({
        'kitchenId': kitchenId,
        'deliveryType': deliveryType,
        'customerAddressId': customerAddressId,
        'customerNotes': customerNotes,
        'items': items
            .map(
              (item) => {
                'menuItemId': item.menuItemId,
                'menuItemSizeId': item.menuItemSizeId,
                'quantity': item.quantity,
                'customerNote': item.customerNote,
              },
            )
            .toList(),
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to create order: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return OrderCreationResult(
      orderId: json['orderId']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
    );
  }

  Future<List<CustomerOrderSummary>> loadMyOrders({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/orders/my'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load my orders: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return (json['orders'] as List<dynamic>? ?? const [])
        .map((item) => CustomerOrderSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<CustomerOrderDetails> loadOrderDetails({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await http.get(
      _buildUri('/api/orders/$orderId'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load order details: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return CustomerOrderDetails.fromJson(json['order'] as Map<String, dynamic>);
  }

  Future<List<KitchenOrderSummary>> loadKitchenOrders({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/kitchen/orders'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load kitchen orders: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return (json['orders'] as List<dynamic>? ?? const [])
        .map((item) => KitchenOrderSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> acceptKitchenOrder({
    required String sessionToken,
    required String orderId,
    double? deliveryFee,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/orders/$orderId/accept'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'deliveryFee': deliveryFee,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to accept kitchen order: ${response.body}');
    }
  }

  Future<void> rejectKitchenOrder({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/orders/$orderId/reject'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to reject kitchen order: ${response.body}');
    }
  }

  Future<void> updateKitchenOrderStatus({
    required String sessionToken,
    required String orderId,
    required String nextStatus,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/orders/$orderId/status'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'nextStatus': nextStatus,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to update kitchen order status: ${response.body}');
    }
  }

  Future<void> submitDepositProof({
    required String sessionToken,
    required String orderId,
    required String imageUrl,
    double? submittedAmount,
  }) async {
    final response = await http.post(
      _buildUri('/api/orders/$orderId/deposit-proof'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'imageUrl': imageUrl,
        'submittedAmount': submittedAmount,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to submit deposit proof: ${response.body}');
    }
  }

  Future<void> sendOrderMessage({
    required String sessionToken,
    required String orderId,
    String? text,
    String? imageUrl,
  }) async {
    final response = await http.post(
      _buildUri('/api/orders/$orderId/messages'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'text': text,
        'imageUrl': imageUrl,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to send message: ${response.body}');
    }
  }

  Future<List<AppNotification>> loadNotifications({
    required String sessionToken,
  }) async {
    final response = await http.get(
      _buildUri('/api/notifications'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load notifications: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return (json['notifications'] as List<dynamic>? ?? const [])
        .map((item) => AppNotification.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> markNotificationRead({
    required String sessionToken,
    required String notificationId,
  }) async {
    final response = await http.patch(
      _buildUri('/api/notifications/$notificationId/read'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to mark notification read: ${response.body}');
    }
  }

  Future<void> approveDepositProof({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/orders/$orderId/deposit/approve'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to approve deposit proof: ${response.body}');
    }
  }

  Future<void> rejectDepositProof({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/orders/$orderId/deposit/reject'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to reject deposit proof: ${response.body}');
    }
  }

  Future<void> confirmReceived({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await http.post(
      _buildUri('/api/orders/$orderId/confirm-received'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to confirm received: ${response.body}');
    }
  }

  Future<void> submitReview({
    required String sessionToken,
    required String orderId,
    required int ratingValue,
    String? comment,
  }) async {
    final response = await http.post(
      _buildUri('/api/orders/$orderId/review'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'ratingValue': ratingValue,
        'comment': comment,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to submit review: ${response.body}');
    }
  }
}

class CustomerAddress {
  const CustomerAddress({
    required this.id,
    required this.label,
    required this.addressLine,
    required this.cityName,
    required this.regionName,
    required this.isDefault,
  });

  factory CustomerAddress.fromJson(Map<String, dynamic> json) {
    final region = (json['region'] as Map<String, dynamic>?) ?? const {};

    return CustomerAddress(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      addressLine: json['addressLine']?.toString() ?? '',
      cityName: region['cityName']?.toString() ?? json['cityName']?.toString() ?? '',
      regionName:
          region['regionName']?.toString() ?? json['regionName']?.toString() ?? '',
      isDefault: json['isDefault'] == true,
    );
  }

  final String id;
  final String label;
  final String addressLine;
  final String cityName;
  final String regionName;
  final bool isDefault;
}

class OrderCreationResult {
  const OrderCreationResult({
    required this.orderId,
    required this.orderNumber,
    required this.status,
  });

  final String orderId;
  final String orderNumber;
  final String status;
}

class CustomerOrderSummary {
  const CustomerOrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.deliveryType,
    required this.totalAmount,
    required this.depositAmount,
    required this.kitchenName,
    required this.itemsCount,
  });

  factory CustomerOrderSummary.fromJson(Map<String, dynamic> json) {
    final kitchen = (json['kitchen'] as Map<String, dynamic>?) ?? const {};
    final items = (json['items'] as List<dynamic>? ?? const []);

    return CustomerOrderSummary(
      id: json['id']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      deliveryType: json['deliveryType']?.toString() ?? 'PICKUP',
      totalAmount: double.tryParse(json['totalAmount']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      kitchenName: kitchen['kitchenName']?.toString() ?? 'مطبخ',
      itemsCount: items.length,
    );
  }

  final String id;
  final String orderNumber;
  final String status;
  final String deliveryType;
  final double totalAmount;
  final double depositAmount;
  final String kitchenName;
  final int itemsCount;
}

class CustomerOrderDetails {
  const CustomerOrderDetails({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.deliveryType,
    required this.subtotalAmount,
    required this.deliveryFee,
    required this.totalAmount,
    required this.depositAmount,
    required this.kitchenName,
    required this.addressLine,
    required this.items,
    required this.depositProofs,
    required this.messages,
    required this.reviewRating,
    required this.reviewComment,
    required this.placedAt,
    required this.acceptedAt,
    required this.depositSubmittedAt,
    required this.depositConfirmedAt,
    required this.deliveredAt,
    required this.completedAt,
  });

  factory CustomerOrderDetails.fromJson(Map<String, dynamic> json) {
    final kitchen = (json['kitchen'] as Map<String, dynamic>?) ?? const {};
    final address = (json['customerAddress'] as Map<String, dynamic>?) ?? const {};

    return CustomerOrderDetails(
      id: json['id']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      deliveryType: json['deliveryType']?.toString() ?? 'PICKUP',
      subtotalAmount:
          double.tryParse(json['subtotalAmount']?.toString() ?? '') ?? 0,
      deliveryFee: double.tryParse(json['deliveryFee']?.toString() ?? '') ?? 0,
      totalAmount: double.tryParse(json['totalAmount']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      kitchenName: kitchen['kitchenName']?.toString() ?? 'مطبخ',
      addressLine: address['addressLine']?.toString(),
      items: (json['items'] as List<dynamic>? ?? const [])
          .map((item) => OrderLineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      depositProofs: (json['depositProofs'] as List<dynamic>? ?? const [])
          .map((item) => DepositProofInfo.fromJson(item as Map<String, dynamic>))
          .toList(),
      messages: (json['messages'] as List<dynamic>? ?? const [])
          .map((item) => OrderMessageInfo.fromJson(item as Map<String, dynamic>))
          .toList(),
      reviewRating: (json['review'] as Map<String, dynamic>?)?['ratingValue'] as int?,
      reviewComment: (json['review'] as Map<String, dynamic>?)?['comment']?.toString(),
      placedAt: _parseDate(json['placedAt']),
      acceptedAt: _parseDate(json['acceptedAt']),
      depositSubmittedAt: _parseDate(json['depositSubmittedAt']),
      depositConfirmedAt: _parseDate(json['depositConfirmedAt']),
      deliveredAt: _parseDate(json['deliveredAt']),
      completedAt: _parseDate(json['completedAt']),
    );
  }

  final String id;
  final String orderNumber;
  final String status;
  final String deliveryType;
  final double subtotalAmount;
  final double deliveryFee;
  final double totalAmount;
  final double depositAmount;
  final String kitchenName;
  final String? addressLine;
  final List<OrderLineItem> items;
  final List<DepositProofInfo> depositProofs;
  final List<OrderMessageInfo> messages;
  final int? reviewRating;
  final String? reviewComment;
  final DateTime? placedAt;
  final DateTime? acceptedAt;
  final DateTime? depositSubmittedAt;
  final DateTime? depositConfirmedAt;
  final DateTime? deliveredAt;
  final DateTime? completedAt;
}

class OrderLineItem {
  const OrderLineItem({
    required this.id,
    required this.itemName,
    required this.sizeName,
    required this.quantity,
    required this.lineTotal,
  });

  factory OrderLineItem.fromJson(Map<String, dynamic> json) {
    return OrderLineItem(
      id: json['id']?.toString() ?? '',
      itemName: json['itemNameSnapshot']?.toString() ?? 'صنف',
      sizeName: json['sizeNameSnapshot']?.toString(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      lineTotal: double.tryParse(json['lineTotal']?.toString() ?? '') ?? 0,
    );
  }

  final String id;
  final String itemName;
  final String? sizeName;
  final int quantity;
  final double lineTotal;
}

class DepositProofInfo {
  const DepositProofInfo({
    required this.id,
    required this.imageUrl,
    required this.reviewStatus,
    required this.submittedAmount,
  });

  factory DepositProofInfo.fromJson(Map<String, dynamic> json) {
    return DepositProofInfo(
      id: json['id']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      reviewStatus: json['reviewStatus']?.toString() ?? '',
      submittedAmount:
          double.tryParse(json['submittedAmount']?.toString() ?? ''),
    );
  }

  final String id;
  final String imageUrl;
  final String reviewStatus;
  final double? submittedAmount;
}

class OrderMessageInfo {
  const OrderMessageInfo({
    required this.id,
    required this.messageType,
    required this.messageText,
    required this.fileUrl,
    required this.senderName,
  });

  factory OrderMessageInfo.fromJson(Map<String, dynamic> json) {
    final sender = (json['sender'] as Map<String, dynamic>?) ?? const {};

    return OrderMessageInfo(
      id: json['id']?.toString() ?? '',
      messageType: json['messageType']?.toString() ?? 'TEXT',
      messageText: json['messageText']?.toString(),
      fileUrl: json['fileUrl']?.toString(),
      senderName: sender['fullName']?.toString() ?? 'مستخدم',
    );
  }

  final String id;
  final String messageType;
  final String? messageText;
  final String? fileUrl;
  final String senderName;
}

class KitchenOrderSummary {
  const KitchenOrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.deliveryType,
    required this.totalAmount,
    required this.customerName,
    required this.customerContact,
    required this.addressLine,
    required this.latestDepositProof,
    required this.items,
  });

  factory KitchenOrderSummary.fromJson(Map<String, dynamic> json) {
    final customer = (json['customer'] as Map<String, dynamic>?) ?? const {};
    final address = (json['customerAddress'] as Map<String, dynamic>?) ?? const {};
    final depositProofs = (json['depositProofs'] as List<dynamic>? ?? const []);

    return KitchenOrderSummary(
      id: json['id']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      deliveryType: json['deliveryType']?.toString() ?? 'PICKUP',
      totalAmount: double.tryParse(json['totalAmount']?.toString() ?? '') ?? 0,
      customerName: customer['fullName']?.toString() ?? 'عميل',
      customerContact:
          customer['phoneNumber']?.toString() ??
          customer['email']?.toString() ??
          '',
      addressLine: address['addressLine']?.toString(),
      latestDepositProof: depositProofs.isNotEmpty
          ? DepositProofInfo.fromJson(depositProofs.first as Map<String, dynamic>)
          : null,
      items: (json['items'] as List<dynamic>? ?? const [])
          .map((item) => OrderLineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  final String id;
  final String orderNumber;
  final String status;
  final String deliveryType;
  final double totalAmount;
  final String customerName;
  final String customerContact;
  final String? addressLine;
  final DepositProofInfo? latestDepositProof;
  final List<OrderLineItem> items;
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'SYSTEM',
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      isRead: json['isRead'] == true,
    );
  }

  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
}

DateTime? _parseDate(Object? value) {
  final raw = value?.toString();
  if (raw == null || raw.isEmpty) {
    return null;
  }
  return DateTime.tryParse(raw);
}
