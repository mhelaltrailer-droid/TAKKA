import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/app_config.dart';
import 'cart_store.dart';

class OrderService {
  const OrderService();

  static const _httpTimeout = Duration(seconds: 25);

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  Future<http.Response> _send(Future<http.Response> request) {
    return request.timeout(
      _httpTimeout,
      onTimeout: () => throw Exception('انتهت مهلة الاتصال بالخادم.'),
    );
  }

  Future<List<CustomerAddress>> loadAddresses({
    required String sessionToken,
  }) async {
    final response = await _send(http.get(
      _buildUri('/api/customer/addresses'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    ));

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
      throw Exception(
        _errorText(_decodeMap(response.body), 'تعذر حفظ العنوان.'),
      );
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
    String? customerContactPhone,
    double? deliveryLatitude,
    double? deliveryLongitude,
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
        'customerContactPhone': customerContactPhone,
        'deliveryLatitude': deliveryLatitude,
        'deliveryLongitude': deliveryLongitude,
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
      throw Exception(
        _errorText(_decodeMap(response.body), 'تعذر إرسال الطلب.'),
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return OrderCreationResult(
      orderId: json['orderId']?.toString() ?? '',
      orderNumber: json['orderNumber']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
    );
  }

  Future<CheckoutQuote> quoteCheckout({
    required String sessionToken,
    required String kitchenId,
    required String deliveryType,
    String? customerAddressId,
    double? deliveryLatitude,
    double? deliveryLongitude,
    required List<CartItem> items,
  }) async {
    final response = await _send(http.post(
      _buildUri('/api/checkout/quote'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
      body: jsonEncode({
        'kitchenId': kitchenId,
        'deliveryType': deliveryType,
        'customerAddressId': customerAddressId,
        'deliveryLatitude': deliveryLatitude,
        'deliveryLongitude': deliveryLongitude,
        'items': items
            .map(
              (item) => {
                'menuItemId': item.menuItemId,
                'menuItemSizeId': item.menuItemSizeId,
                'quantity': item.quantity,
                'customerNote': item.customerNote,
                'expectedUnitPrice': item.unitPrice,
                'expectedDepositAmount': item.depositAmount,
              },
            )
            .toList(),
      }),
    ));

    final json = _decodeMap(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_errorText(json, 'تعذر مراجعة أسعار السلة.'));
    }
    return CheckoutQuote.fromJson(json);
  }

  Future<List<CustomerOrderSummary>> loadMyOrders({
    required String sessionToken,
  }) async {
    final response = await _send(http.get(
      _buildUri('/api/orders/my'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    ));

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
    final response = await _send(http.get(
      _buildUri('/api/orders/$orderId'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    ));

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
    String? reason,
  }) async {
    final response = await http.post(
      _buildUri('/api/kitchen/orders/$orderId/reject'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      }),
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

  Future<List<OrderMessageInfo>> loadOrderMessages({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await http.get(
      _buildUri('/api/orders/$orderId/messages'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to load messages: ${response.body}');
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return (json['messages'] as List<dynamic>? ?? const [])
        .map((item) => OrderMessageInfo.fromJson(item as Map<String, dynamic>))
        .toList();
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
    final response = await _send(http.post(
      _buildUri('/api/orders/$orderId/confirm-received'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    ));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to confirm received: ${response.body}');
    }
  }

  Future<void> cancelOrder({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await _send(http.post(
      _buildUri('/api/orders/$orderId/cancel'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    ));

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to cancel order: ${response.body}');
    }
  }

  Future<ReorderPreview> loadReorderPreview({
    required String sessionToken,
    required String orderId,
  }) async {
    final response = await _send(http.get(
      _buildUri('/api/orders/$orderId/reorder-preview'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
      },
    ));
    final json = _decodeMap(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(_errorText(json, 'تعذر تجهيز الطلب تاني.'));
    }
    return ReorderPreview.fromJson(json);
  }

  Future<void> logOrderIssue({
    required String sessionToken,
    required String orderId,
    required String type,
    String? note,
  }) async {
    final response = await _send(http.post(
      _buildUri('/api/orders/$orderId/issues'),
      headers: {
        'Authorization': 'Bearer $sessionToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'type': type,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      }),
    ));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        _errorText(_decodeMap(response.body), 'تعذر تسجيل المشكلة.'),
      );
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
    required this.latitude,
    required this.longitude,
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
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }

  final String id;
  final String label;
  final String addressLine;
  final String cityName;
  final String regionName;
  final bool isDefault;
  final double? latitude;
  final double? longitude;
}

class CheckoutQuoteLine {
  const CheckoutQuoteLine({
    required this.available,
    required this.unitPrice,
    required this.depositAmount,
    required this.priceChanged,
    required this.depositChanged,
  });

  factory CheckoutQuoteLine.fromJson(Map<String, dynamic> json) {
    return CheckoutQuoteLine(
      available: json['available'] == true,
      unitPrice: (json['unitPrice'] as num?)?.toDouble(),
      depositAmount: (json['depositAmount'] as num?)?.toDouble(),
      priceChanged: json['priceChanged'] == true,
      depositChanged: json['depositChanged'] == true,
    );
  }

  final bool available;
  final double? unitPrice;
  final double? depositAmount;
  final bool priceChanged;
  final bool depositChanged;
}

class CheckoutQuoteChange {
  const CheckoutQuoteChange({
    required this.kind,
    required this.message,
  });

  factory CheckoutQuoteChange.fromJson(Map<String, dynamic> json) {
    return CheckoutQuoteChange(
      kind: json['kind']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
    );
  }

  final String kind;
  final String message;
}

class CheckoutQuote {
  const CheckoutQuote({
    required this.orderable,
    required this.blockingError,
    required this.lines,
    required this.changes,
  });

  factory CheckoutQuote.fromJson(Map<String, dynamic> json) {
    return CheckoutQuote(
      orderable: json['orderable'] == true,
      blockingError: json['blockingError']?.toString(),
      lines: (json['lines'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (item) => CheckoutQuoteLine.fromJson(
              Map<String, dynamic>.from(item),
            ),
          )
          .toList(),
      changes: (json['changes'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (item) => CheckoutQuoteChange.fromJson(
              Map<String, dynamic>.from(item),
            ),
          )
          .toList(),
    );
  }

  final bool orderable;
  final String? blockingError;
  final List<CheckoutQuoteLine> lines;
  final List<CheckoutQuoteChange> changes;

  bool get needsReview => !orderable || changes.isNotEmpty;
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
    required this.kitchenId,
    required this.kitchenName,
    required this.kitchenSlug,
    required this.itemsCount,
    required this.createdAt,
    required this.hasReview,
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
      kitchenId: kitchen['id']?.toString() ?? '',
      kitchenName: kitchen['kitchenName']?.toString() ?? 'مطبخ',
      kitchenSlug: kitchen['slug']?.toString() ?? '',
      itemsCount: items.length,
      createdAt: _parseDate(json['createdAt']),
      hasReview: json['review'] != null,
    );
  }

  final String id;
  final String orderNumber;
  final String status;
  final String deliveryType;
  final double totalAmount;
  final double depositAmount;
  final String kitchenId;
  final String kitchenName;
  final String kitchenSlug;
  final int itemsCount;
  final DateTime? createdAt;
  final bool hasReview;
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
    required this.kitchenId,
    required this.kitchenName,
    required this.kitchenSlug,
    required this.kitchenPhone,
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
    required this.cancelCustomerMessage,
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
      kitchenId: kitchen['id']?.toString() ?? '',
      kitchenName: kitchen['kitchenName']?.toString() ?? 'مطبخ',
      kitchenSlug: kitchen['slug']?.toString() ?? '',
      kitchenPhone: kitchen['phoneNumber']?.toString(),
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
      cancelCustomerMessage: json['cancelCustomerMessage']?.toString(),
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
  final String kitchenId;
  final String kitchenName;
  final String kitchenSlug;
  final String? kitchenPhone;
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
  final String? cancelCustomerMessage;
}

class OrderLineItem {
  const OrderLineItem({
    required this.id,
    required this.itemName,
    required this.sizeName,
    required this.quantity,
    required this.lineTotal,
    required this.customerNote,
  });

  factory OrderLineItem.fromJson(Map<String, dynamic> json) {
    return OrderLineItem(
      id: json['id']?.toString() ?? '',
      itemName: json['itemNameSnapshot']?.toString() ?? 'صنف',
      sizeName: json['sizeNameSnapshot']?.toString(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      lineTotal: double.tryParse(json['lineTotal']?.toString() ?? '') ?? 0,
      customerNote: json['customerNote']?.toString(),
    );
  }

  final String id;
  final String itemName;
  final String? sizeName;
  final int quantity;
  final double lineTotal;
  final String? customerNote;
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
    required this.customerPhone,
    required this.customerContactPhone,
    required this.customerNotes,
    required this.addressLine,
    required this.deliveryLatitude,
    required this.deliveryLongitude,
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
      customerPhone: customer['phoneNumber']?.toString() ?? '',
      customerContactPhone: json['customerContactPhone']?.toString(),
      customerNotes: json['customerNotes']?.toString(),
      addressLine: address['addressLine']?.toString(),
      deliveryLatitude: (json['deliveryLatitude'] as num?)?.toDouble(),
      deliveryLongitude: (json['deliveryLongitude'] as num?)?.toDouble(),
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
  final String customerPhone;
  final String? customerContactPhone;
  final String? customerNotes;
  final String? addressLine;
  final double? deliveryLatitude;
  final double? deliveryLongitude;
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

Map<String, dynamic> _decodeMap(String body) {
  try {
    final decoded = jsonDecode(body);
    if (decoded is Map<String, dynamic>) return decoded;
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
  } catch (_) {}
  return const {};
}

String _errorText(Map<String, dynamic> json, String fallback) {
  final error = json['error']?.toString().trim() ?? '';
  if (error.isEmpty) return fallback;
  return error;
}

class ReorderPreviewItem {
  const ReorderPreviewItem({
    required this.menuItemId,
    required this.menuItemName,
    required this.menuItemSizeId,
    required this.sizeName,
    required this.quantity,
    required this.customerNote,
    required this.unitPrice,
    required this.depositAmount,
    required this.orderReadiness,
  });

  factory ReorderPreviewItem.fromJson(Map<String, dynamic> json) {
    return ReorderPreviewItem(
      menuItemId: json['menuItemId']?.toString() ?? '',
      menuItemName: json['menuItemName']?.toString() ?? 'صنف',
      menuItemSizeId: json['menuItemSizeId']?.toString(),
      sizeName: json['sizeName']?.toString(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      customerNote: json['customerNote']?.toString(),
      unitPrice: double.tryParse(json['unitPrice']?.toString() ?? '') ?? 0,
      depositAmount:
          double.tryParse(json['depositAmount']?.toString() ?? '') ?? 0,
      orderReadiness: json['orderReadiness']?.toString() ?? 'AVAILABLE_NOW',
    );
  }

  final String menuItemId;
  final String menuItemName;
  final String? menuItemSizeId;
  final String? sizeName;
  final int quantity;
  final String? customerNote;
  final double unitPrice;
  final double depositAmount;
  final String orderReadiness;
}

class ReorderPreviewKitchen {
  const ReorderPreviewKitchen({
    required this.id,
    required this.kitchenName,
    required this.slug,
    required this.latitude,
    required this.longitude,
    required this.addressLine,
    required this.regionLabel,
  });

  factory ReorderPreviewKitchen.fromJson(Map<String, dynamic> json) {
    return ReorderPreviewKitchen(
      id: json['id']?.toString() ?? '',
      kitchenName: json['kitchenName']?.toString() ?? 'مطبخ',
      slug: json['slug']?.toString() ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      addressLine: json['addressLine']?.toString() ?? '',
      regionLabel: json['regionLabel']?.toString() ?? '',
    );
  }

  final String id;
  final String kitchenName;
  final String slug;
  final double? latitude;
  final double? longitude;
  final String addressLine;
  final String regionLabel;
}

class ReorderPreview {
  const ReorderPreview({
    required this.kitchenAvailable,
    required this.message,
    required this.kitchen,
    required this.items,
    required this.notices,
  });

  factory ReorderPreview.fromJson(Map<String, dynamic> json) {
    final kitchenRaw = json['kitchen'];
    return ReorderPreview(
      kitchenAvailable: json['kitchenAvailable'] == true,
      message: json['message']?.toString(),
      kitchen: kitchenRaw is Map<String, dynamic>
          ? ReorderPreviewKitchen.fromJson(kitchenRaw)
          : kitchenRaw is Map
              ? ReorderPreviewKitchen.fromJson(
                  Map<String, dynamic>.from(kitchenRaw),
                )
              : null,
      items: (json['items'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (item) => ReorderPreviewItem.fromJson(
              Map<String, dynamic>.from(item),
            ),
          )
          .toList(),
      notices: (json['notices'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .where((item) => item.trim().isNotEmpty)
          .toList(),
    );
  }

  final bool kitchenAvailable;
  final String? message;
  final ReorderPreviewKitchen? kitchen;
  final List<ReorderPreviewItem> items;
  final List<String> notices;
}

DateTime? _parseDate(Object? value) {
  final raw = value?.toString();
  if (raw == null || raw.isEmpty) {
    return null;
  }
  return DateTime.tryParse(raw);
}
