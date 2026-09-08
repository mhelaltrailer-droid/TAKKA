import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../data/cart_store.dart';
import '../data/order_service.dart';
import '../../orders/presentation/order_tracking_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _cart = CartStore.instance;
  final _orderService = const OrderService();
  final _notesController = TextEditingController();

  String _deliveryType = 'pickup';
  bool _isSubmitting = false;
  Future<List<CustomerAddress>>? _addressesFuture;
  String? _selectedAddressId;

  @override
  void initState() {
    super.initState();
    _addressesFuture = _loadAddresses();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<List<CustomerAddress>> _loadAddresses() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    final addresses = await _orderService.loadAddresses(sessionToken: token.jwt);

    if (_selectedAddressId == null && addresses.isNotEmpty) {
      final preferred = addresses.firstWhere(
        (address) => address.isDefault,
        orElse: () => addresses.first,
      );
      _selectedAddressId = preferred.id;
    }

    return addresses;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('السلة ومراجعة الطلب'),
        actions: [
          if (!_cart.isEmpty)
            TextButton(
              onPressed: () {
                _cart.clear();
                setState(() {});
              },
              child: const Text('تفريغ السلة'),
            ),
        ],
      ),
      body: ListenableBuilder(
        listenable: _cart,
        builder: (context, _) {
          if (_cart.isEmpty) {
            return const _EmptyCartState();
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _cart.kitchenName ?? 'مطبخ الطلب',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'كل الطلبات في هذه السلة يجب أن تكون من نفس المطبخ.',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              ..._cart.items.map((item) => _CartItemCard(item: item)),
              const SizedBox(height: 18),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'طريقة الاستلام',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment<String>(
                            value: 'pickup',
                            label: Text('استلام'),
                            icon: Icon(Icons.store_mall_directory_outlined),
                          ),
                          ButtonSegment<String>(
                            value: 'delivery',
                            label: Text('توصيل'),
                            icon: Icon(Icons.local_shipping_outlined),
                          ),
                        ],
                        selected: {_deliveryType},
                        onSelectionChanged: (selection) {
                          setState(() => _deliveryType = selection.first);
                        },
                      ),
                      if (_deliveryType == 'delivery') ...[
                        const SizedBox(height: 8),
                        const Text(
                          'عنوان التوصيل',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        FutureBuilder<List<CustomerAddress>>(
                          future: _addressesFuture,
                          builder: (context, snapshot) {
                            if (snapshot.connectionState != ConnectionState.done) {
                              return const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: CircularProgressIndicator(),
                              );
                            }

                            if (snapshot.hasError) {
                              return Text(
                                'تعذر تحميل العناوين: ${snapshot.error}',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                ),
                              );
                            }

                            final addresses = snapshot.data ?? const [];
                            if (addresses.isEmpty) {
                              return const Text(
                                'لا توجد عناوين محفوظة. أضف عنوانًا من الويب أو API أولًا قبل طلب التوصيل.',
                              );
                            }

                            return DropdownButtonFormField<String>(
                              initialValue: _selectedAddressId,
                              decoration: const InputDecoration(
                                hintText: 'اختر عنوان التوصيل',
                              ),
                              items: addresses
                                  .map(
                                    (address) => DropdownMenuItem<String>(
                                      value: address.id,
                                      child: Text(
                                        '${address.label} - ${address.cityName} / ${address.regionName}',
                                      ),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) {
                                setState(() => _selectedAddressId = value);
                              },
                            );
                          },
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'ملاحظات الطلب',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _notesController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          hintText: 'أي تعليمات إضافية للطلب',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: [
                      _SummaryRow(
                        label: 'عدد العناصر',
                        value: _cart.totalItems.toString(),
                      ),
                      _SummaryRow(
                        label: 'الإجمالي المبدئي',
                        value: '${_cart.subtotal.toStringAsFixed(0)} ج.م',
                      ),
                      _SummaryRow(
                        label: 'إجمالي العربون',
                        value: '${_cart.depositTotal.toStringAsFixed(0)} ج.م',
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _isSubmitting ? null : _submitOrder,
                          icon: _isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.shopping_cart_checkout_rounded),
                          label: Text(
                            _isSubmitting ? 'جارٍ إرسال الطلب...' : 'إرسال الطلب',
                          ),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _submitOrder() async {
    if (_cart.kitchenId == null || _cart.items.isEmpty) {
      return;
    }

    if (_deliveryType == 'delivery' && _selectedAddressId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('اختر عنوان توصيل قبل إرسال الطلب.'),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();

      final result = await _orderService.createOrder(
        sessionToken: token.jwt,
        kitchenId: _cart.kitchenId!,
        deliveryType: _deliveryType,
        customerAddressId: _deliveryType == 'delivery' ? _selectedAddressId : null,
        customerNotes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        items: _cart.items,
      );

      _cart.clear();

      if (!mounted) {
        return;
      }

      showDialog<void>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('تم إنشاء الطلب'),
            content: Text(
              'تم إرسال الطلب بنجاح.\nرقم الطلب: ${result.orderNumber}',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => OrderTrackingScreen(orderId: result.orderId),
                    ),
                  );
                },
                child: const Text('حسنًا'),
              ),
            ],
          );
        },
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('تعذر إرسال الطلب: $error'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({
    required this.item,
  });

  final CartItem item;

  @override
  Widget build(BuildContext context) {
    final cart = CartStore.instance;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.menuItemName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => cart.removeItem(item.id),
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ],
            ),
            if (item.sizeName != null && item.sizeName!.isNotEmpty)
              Text('الحجم: ${item.sizeName}'),
            if (item.customerNote != null && item.customerNote!.isNotEmpty)
              Text('ملاحظة: ${item.customerNote}'),
            const SizedBox(height: 10),
            Row(
              children: [
                IconButton(
                  onPressed: () => cart.updateQuantity(item.id, item.quantity - 1),
                  icon: const Icon(Icons.remove_circle_outline_rounded),
                ),
                Text(
                  item.quantity.toString(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                IconButton(
                  onPressed: () => cart.updateQuantity(item.id, item.quantity + 1),
                  icon: const Icon(Icons.add_circle_outline_rounded),
                ),
                const Spacer(),
                Text(
                  '${item.lineTotal.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(label),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _EmptyCartState extends StatelessWidget {
  const _EmptyCartState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.remove_shopping_cart_outlined, size: 44),
                const SizedBox(height: 12),
                const Text(
                  'السلة فارغة',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  'ارجع إلى المنيو وأضف بعض الأصناف أولًا.',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
