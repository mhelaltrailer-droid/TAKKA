import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CartQuoteLineUpdate {
  const CartQuoteLineUpdate({
    required this.available,
    required this.unitPrice,
    required this.depositAmount,
  });

  final bool available;
  final double? unitPrice;
  final double? depositAmount;
}

class CartStore extends ChangeNotifier {
  CartStore._();

  static final CartStore instance = CartStore._();
  static const _storageKey = 'takka_cart_v1';

  String? kitchenId;
  String? kitchenName;
  double? kitchenLatitude;
  double? kitchenLongitude;
  String? kitchenAddressLine;
  String? kitchenRegionLabel;
  final List<CartItem> _items = [];

  Future<void>? _loadFuture;
  var _hydrated = false;
  Future<void> _persistQueue = Future<void>.value();

  List<CartItem> get items => List.unmodifiable(_items);

  int get totalItems => _items.fold(0, (sum, item) => sum + item.quantity);

  double get subtotal =>
      _items.fold(0, (sum, item) => sum + item.lineTotal);

  double get depositTotal =>
      _items.fold(0, (sum, item) => sum + item.depositLineTotal);

  bool get isEmpty => _items.isEmpty;

  Future<void> ensureLoaded() {
    return _loadFuture ??= _load();
  }

  void addItem({
    required String kitchenId,
    required String kitchenName,
    double? kitchenLatitude,
    double? kitchenLongitude,
    String? kitchenAddressLine,
    String? kitchenRegionLabel,
    required CartItem item,
  }) {
    if (_items.isNotEmpty && this.kitchenId != kitchenId) {
      throw StateError('لا يمكن إضافة أصناف من أكثر من مطبخ في نفس الطلب.');
    }

    this.kitchenId = kitchenId;
    this.kitchenName = kitchenName;
    this.kitchenLatitude = kitchenLatitude ?? this.kitchenLatitude;
    this.kitchenLongitude = kitchenLongitude ?? this.kitchenLongitude;
    this.kitchenAddressLine = kitchenAddressLine ?? this.kitchenAddressLine;
    this.kitchenRegionLabel = kitchenRegionLabel ?? this.kitchenRegionLabel;

    final existingIndex = _items.indexWhere(
      (existing) =>
          existing.menuItemId == item.menuItemId &&
          existing.menuItemSizeId == item.menuItemSizeId &&
          existing.customerNote == item.customerNote,
    );

    if (existingIndex >= 0) {
      final existing = _items[existingIndex];
      _items[existingIndex] = existing.copyWith(
        quantity: existing.quantity + item.quantity,
      );
    } else {
      _items.add(item);
    }

    _afterChange();
  }

  void updateQuantity(String itemId, int quantity) {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    final index = _items.indexWhere((item) => item.id == itemId);
    if (index < 0) {
      return;
    }

    _items[index] = _items[index].copyWith(quantity: quantity);
    _afterChange();
  }

  void removeItem(String itemId) {
    _items.removeWhere((item) => item.id == itemId);
    if (_items.isEmpty) {
      _clearKitchenMeta();
    }
    _afterChange();
  }

  /// Applies quote lines aligned with the current cart order.
  /// Returns true when a line was removed or its price changed.
  bool applyQuoteLines({
    required List<String> itemIds,
    required List<CartQuoteLineUpdate> lines,
  }) {
    if (itemIds.length != lines.length || itemIds.length != _items.length) {
      return false;
    }
    for (var i = 0; i < itemIds.length; i++) {
      if (_items[i].id != itemIds[i]) {
        return false;
      }
    }

    final next = <CartItem>[];
    var changed = false;
    for (var i = 0; i < _items.length; i++) {
      final item = _items[i];
      final line = lines[i];
      if (!line.available || line.unitPrice == null) {
        changed = true;
        continue;
      }
      final deposit = line.depositAmount ?? item.depositAmount;
      final priceChanged = (item.unitPrice - line.unitPrice!).abs() >= 0.009;
      final depositChanged = (item.depositAmount - deposit).abs() >= 0.009;
      if (priceChanged || depositChanged) {
        changed = true;
        next.add(
          item.copyWith(unitPrice: line.unitPrice, depositAmount: deposit),
        );
      } else {
        next.add(item);
      }
    }

    if (!changed) {
      return false;
    }

    _items
      ..clear()
      ..addAll(next);
    if (_items.isEmpty) {
      _clearKitchenMeta();
    }
    _afterChange();
    return true;
  }

  /// Rebuilds the cart for one kitchen. Used by "اطلب تاني".
  void replaceWith({
    required String kitchenId,
    required String kitchenName,
    double? kitchenLatitude,
    double? kitchenLongitude,
    String? kitchenAddressLine,
    String? kitchenRegionLabel,
    required List<CartItem> items,
  }) {
    _items
      ..clear()
      ..addAll(items);
    if (items.isEmpty) {
      _clearKitchenMeta();
    } else {
      this.kitchenId = kitchenId;
      this.kitchenName = kitchenName;
      this.kitchenLatitude = kitchenLatitude;
      this.kitchenLongitude = kitchenLongitude;
      this.kitchenAddressLine = kitchenAddressLine;
      this.kitchenRegionLabel = kitchenRegionLabel;
    }
    _afterChange();
  }

  void clear() {
    _clearKitchenMeta();
    _items.clear();
    _afterChange();
  }

  void _clearKitchenMeta() {
    kitchenId = null;
    kitchenName = null;
    kitchenLatitude = null;
    kitchenLongitude = null;
    kitchenAddressLine = null;
    kitchenRegionLabel = null;
  }

  void _afterChange() {
    notifyListeners();
    _schedulePersist();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_storageKey);
      if (raw != null && raw.isNotEmpty && _items.isEmpty) {
        _readSnapshot(raw);
      }
    } catch (_) {
      // Keep the in-memory cart if storage is unavailable.
    }
    _hydrated = true;
    notifyListeners();
  }

  void _schedulePersist() {
    if (!_hydrated) {
      return;
    }
    _persistQueue = _persistQueue.then((_) => _write());
  }

  Future<void> _write() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_items.isEmpty) {
        await prefs.remove(_storageKey);
        return;
      }
      await prefs.setString(_storageKey, jsonEncode(_toJson()));
    } catch (_) {}
  }

  Map<String, dynamic> _toJson() {
    return {
      'kitchenId': kitchenId,
      'kitchenName': kitchenName,
      'kitchenLatitude': kitchenLatitude,
      'kitchenLongitude': kitchenLongitude,
      'kitchenAddressLine': kitchenAddressLine,
      'kitchenRegionLabel': kitchenRegionLabel,
      'items': _items.map((item) => item.toJson()).toList(),
    };
  }

  void _readSnapshot(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        return;
      }
      final json = Map<String, dynamic>.from(decoded);
      final rawItems = json['items'];
      if (rawItems is! List) {
        return;
      }
      final items = <CartItem>[];
      for (final entry in rawItems) {
        if (entry is! Map) {
          continue;
        }
        final item = CartItem.tryFromJson(Map<String, dynamic>.from(entry));
        if (item != null) {
          items.add(item);
        }
      }
      if (items.isEmpty) {
        return;
      }
      _items
        ..clear()
        ..addAll(items);
      kitchenId = json['kitchenId']?.toString();
      kitchenName = json['kitchenName']?.toString();
      kitchenLatitude = (json['kitchenLatitude'] as num?)?.toDouble();
      kitchenLongitude = (json['kitchenLongitude'] as num?)?.toDouble();
      kitchenAddressLine = json['kitchenAddressLine']?.toString();
      kitchenRegionLabel = json['kitchenRegionLabel']?.toString();
    } catch (_) {}
  }
}

class CartItem {
  const CartItem({
    required this.id,
    required this.menuItemId,
    required this.menuItemName,
    required this.menuItemSizeId,
    required this.sizeName,
    required this.unitPrice,
    required this.depositAmount,
    required this.quantity,
    required this.customerNote,
  });

  final String id;
  final String menuItemId;
  final String menuItemName;
  final String? menuItemSizeId;
  final String? sizeName;
  final double unitPrice;
  final double depositAmount;
  final int quantity;
  final String? customerNote;

  double get lineTotal => unitPrice * quantity;
  double get depositLineTotal => depositAmount * quantity;

  CartItem copyWith({
    int? quantity,
    double? unitPrice,
    double? depositAmount,
  }) {
    return CartItem(
      id: id,
      menuItemId: menuItemId,
      menuItemName: menuItemName,
      menuItemSizeId: menuItemSizeId,
      sizeName: sizeName,
      unitPrice: unitPrice ?? this.unitPrice,
      depositAmount: depositAmount ?? this.depositAmount,
      quantity: quantity ?? this.quantity,
      customerNote: customerNote,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'menuItemId': menuItemId,
      'menuItemName': menuItemName,
      'menuItemSizeId': menuItemSizeId,
      'sizeName': sizeName,
      'unitPrice': unitPrice,
      'depositAmount': depositAmount,
      'quantity': quantity,
      'customerNote': customerNote,
    };
  }

  static CartItem? tryFromJson(Map<String, dynamic> json) {
    final id = json['id']?.toString() ?? '';
    final menuItemId = json['menuItemId']?.toString() ?? '';
    final quantity = (json['quantity'] as num?)?.toInt() ?? 0;
    if (id.isEmpty || menuItemId.isEmpty || quantity <= 0) {
      return null;
    }
    final sizeId = json['menuItemSizeId']?.toString();
    final sizeName = json['sizeName']?.toString();
    final note = json['customerNote']?.toString();
    return CartItem(
      id: id,
      menuItemId: menuItemId,
      menuItemName: json['menuItemName']?.toString() ?? 'صنف',
      menuItemSizeId: sizeId == null || sizeId.isEmpty ? null : sizeId,
      sizeName: sizeName == null || sizeName.isEmpty ? null : sizeName,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      depositAmount: (json['depositAmount'] as num?)?.toDouble() ?? 0,
      quantity: quantity,
      customerNote: note == null || note.trim().isEmpty ? null : note.trim(),
    );
  }
}
