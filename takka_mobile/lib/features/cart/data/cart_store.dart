import 'package:flutter/foundation.dart';

class CartStore extends ChangeNotifier {
  CartStore._();

  static final CartStore instance = CartStore._();

  String? kitchenId;
  String? kitchenName;
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  int get totalItems => _items.fold(0, (sum, item) => sum + item.quantity);

  double get subtotal =>
      _items.fold(0, (sum, item) => sum + item.lineTotal);

  double get depositTotal =>
      _items.fold(0, (sum, item) => sum + item.depositLineTotal);

  bool get isEmpty => _items.isEmpty;

  void addItem({
    required String kitchenId,
    required String kitchenName,
    required CartItem item,
  }) {
    if (_items.isNotEmpty && this.kitchenId != kitchenId) {
      throw StateError('لا يمكن إضافة أصناف من أكثر من مطبخ في نفس الطلب.');
    }

    this.kitchenId = kitchenId;
    this.kitchenName = kitchenName;

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

    notifyListeners();
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
    notifyListeners();
  }

  void removeItem(String itemId) {
    _items.removeWhere((item) => item.id == itemId);
    if (_items.isEmpty) {
      kitchenId = null;
      kitchenName = null;
    }
    notifyListeners();
  }

  void clear() {
    kitchenId = null;
    kitchenName = null;
    _items.clear();
    notifyListeners();
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
  }) {
    return CartItem(
      id: id,
      menuItemId: menuItemId,
      menuItemName: menuItemName,
      menuItemSizeId: menuItemSizeId,
      sizeName: sizeName,
      unitPrice: unitPrice,
      depositAmount: depositAmount,
      quantity: quantity ?? this.quantity,
      customerNote: customerNote,
    );
  }
}
