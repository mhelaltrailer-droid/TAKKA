import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/location/kitchen_location_actions.dart';
import '../../../core/validation/phone.dart';
import '../../home/data/customer_discovery_service.dart';
import '../../orders/presentation/order_tracking_screen.dart';
import '../data/cart_store.dart';
import '../data/order_service.dart';
import 'addresses_screen.dart';
import 'delivery_location_picker_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _cart = CartStore.instance;
  final _orderService = const OrderService();
  final _discoveryService = const CustomerDiscoveryService();
  final _notesController = TextEditingController();
  final _contactPhoneController = TextEditingController();

  String _deliveryType = 'pickup';
  bool _isSubmitting = false;
  Future<List<CustomerAddress>>? _addressesFuture;
  Future<String?>? _registeredPhoneFuture;
  String? _selectedAddressId;
  DeliveryCoords? _deliveryCoords;

  @override
  void initState() {
    super.initState();
    _addressesFuture = _loadAddresses();
    _registeredPhoneFuture = _loadRegisteredPhone();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _contactPhoneController.dispose();
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
      _applyAddressPin(preferred);
    } else if (_selectedAddressId != null) {
      final match = addresses.where((address) => address.id == _selectedAddressId);
      if (match.isNotEmpty) {
        _applyAddressPin(match.first);
      }
    }

    return addresses;
  }

  void _applyAddressPin(CustomerAddress address) {
    if (address.latitude != null && address.longitude != null) {
      _deliveryCoords = DeliveryCoords(
        latitude: address.latitude!,
        longitude: address.longitude!,
      );
    }
  }

  Future<void> _openAddAddress() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const AddressesScreen(popOnSave: true),
      ),
    );
    if (!mounted) {
      return;
    }
    setState(() {
      _selectedAddressId = null;
      _deliveryCoords = null;
      _addressesFuture = _loadAddresses();
    });
  }

  void _selectAddress(String? addressId, List<CustomerAddress> addresses) {
    setState(() {
      _selectedAddressId = addressId;
      _deliveryCoords = null;
      if (addressId != null) {
        final match = addresses.where((address) => address.id == addressId);
        if (match.isNotEmpty) {
          _applyAddressPin(match.first);
        }
      }
    });
  }

  Future<String?> _loadRegisteredPhone() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    final user = await _discoveryService.loadMe(sessionToken: token.jwt);
    return user.phoneNumber;
  }

  String _formatRegisteredPhone(String? phone) {
    final raw = (phone ?? '').trim();
    if (raw.isEmpty) {
      return 'غير متوفر على الحساب';
    }
    return raw;
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
                      const SizedBox(height: 8),
                      Text(
                        'شوف موقع المطبخ أولًا عشان تقرر: توصيل ولا استلام بنفسك؟',
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          height: 1.4,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 10),
                      KitchenLocationActions(
                        latitude: _cart.kitchenLatitude,
                        longitude: _cart.kitchenLongitude,
                        addressLine: _cart.kitchenAddressLine,
                        regionLabel: _cart.kitchenRegionLabel,
                      ),
                      const SizedBox(height: 12),
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
                          setState(() {
                            _deliveryType = selection.first;
                            if (_deliveryType == 'pickup') {
                              _deliveryCoords = null;
                            } else if (_selectedAddressId != null) {
                              // Re-apply saved pin when returning to delivery.
                              _addressesFuture?.then((addresses) {
                                if (!mounted) {
                                  return;
                                }
                                final match = addresses.where(
                                  (address) => address.id == _selectedAddressId,
                                );
                                if (match.isEmpty) {
                                  return;
                                }
                                setState(() => _applyAddressPin(match.first));
                              });
                            }
                          });
                        },
                      ),
                      if (_deliveryType == 'delivery') ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'عنوان التوصيل',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            TextButton(
                              onPressed: _openAddAddress,
                              child: const Text('أضف عنوانًا'),
                            ),
                          ],
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
                              return Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFFBEB),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: const Color(0xFFFDE68A),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    const Text(
                                      'لا توجد عناوين محفوظة. أضف عنوان توصيل أولًا ثم أكّد الموقع على الخريطة.',
                                      style: TextStyle(height: 1.5),
                                    ),
                                    const SizedBox(height: 12),
                                    FilledButton(
                                      onPressed: _openAddAddress,
                                      child: const Text('أضف عنوانًا'),
                                    ),
                                  ],
                                ),
                              );
                            }

                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                DropdownButtonFormField<String>(
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
                                  onChanged: (value) =>
                                      _selectAddress(value, addresses),
                                ),
                                if (_selectedAddressId == null) ...[
                                  const SizedBox(height: 8),
                                  const Text(
                                    'اختر عنوانًا لفتح الخريطة بدبوس جاهز.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF71717A),
                                      height: 1.4,
                                    ),
                                  ),
                                ] else ...[
                                  const SizedBox(height: 12),
                                  const Text(
                                    'موقع التوصيل على الخريطة',
                                    style: TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 8),
                                  if (_deliveryCoords != null)
                                    const Text(
                                      'تم وضع الدبوس من عنوانك. عدّله إن لزم أو أرسل الطلب مباشرة.',
                                      style: TextStyle(
                                        color: Color(0xFF166534),
                                        fontSize: 12,
                                        height: 1.4,
                                      ),
                                    )
                                  else
                                    Text(
                                      'افتح الخريطة وضع الدبوس ثم أكّد الموقع مرة واحدة.',
                                      style: TextStyle(
                                        color: Colors.amber.shade900,
                                        fontSize: 12,
                                        height: 1.4,
                                      ),
                                    ),
                                  const SizedBox(height: 8),
                                  OutlinedButton.icon(
                                    onPressed: _openDeliveryMap,
                                    icon: const Icon(Icons.map_outlined),
                                    label: Text(
                                      _deliveryCoords == null
                                          ? 'فتح الخريطة وتأكيد الموقع'
                                          : 'تعديل موقع التوصيل',
                                    ),
                                  ),
                                  if (_deliveryCoords != null) ...[
                                    const SizedBox(height: 8),
                                    Text(
                                      'الموقع: ${_deliveryCoords!.latitude.toStringAsFixed(5)}, ${_deliveryCoords!.longitude.toStringAsFixed(5)}',
                                      style: const TextStyle(
                                        color: Color(0xFF166534),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ],
                              ],
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
                        'وسيلة التواصل (الهاتف)',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'رقم الهاتف المسجّل',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      FutureBuilder<String?>(
                        future: _registeredPhoneFuture,
                        builder: (context, snapshot) {
                          final text =
                              snapshot.connectionState == ConnectionState.done
                                  ? _formatRegisteredPhone(snapshot.data)
                                  : 'جارٍ التحميل...';
                          return InputDecorator(
                            decoration: const InputDecoration(
                              filled: true,
                            ),
                            child: Text(text),
                          );
                        },
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'يُجلب تلقائيًا من بيانات تسجيل حسابك في التطبيق.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 12,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'رقم هاتف تواصل آخر (اختياري)',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _contactPhoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          hintText: '01*********',
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
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Text(
                          'قبل إرسال الطلب\nالعربون الآن · التوصيل بعد القبول · الباقي عند الاستلام',
                          style: TextStyle(
                            height: 1.45,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
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

  Future<void> _openDeliveryMap() async {
    DeliveryCoords? initial = _deliveryCoords;

    if (initial == null) {
      try {
        final addresses = await _addressesFuture;
        final match = addresses?.where((a) => a.id == _selectedAddressId);
        final selected = match != null && match.isNotEmpty ? match.first : null;
        if (selected?.latitude != null && selected?.longitude != null) {
          initial = DeliveryCoords(
            latitude: selected!.latitude!,
            longitude: selected.longitude!,
          );
        }
      } catch (_) {}
    }

    if (!mounted) {
      return;
    }

    final result = await Navigator.of(context).push<DeliveryCoords>(
      MaterialPageRoute(
        builder: (_) => DeliveryLocationPickerScreen(initial: initial),
      ),
    );

    if (result != null && mounted) {
      setState(() => _deliveryCoords = result);
    }
  }

  Future<void> _submitOrder() async {
    if (_cart.kitchenId == null || _cart.items.isEmpty) {
      return;
    }

    if (_deliveryType == 'delivery' && _selectedAddressId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('اختر عنوان توصيل أو أضف عنوانًا جديدًا.'),
        ),
      );
      return;
    }

    if (_deliveryType == 'delivery' && _deliveryCoords == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'ضع دبوس التوصيل على الخريطة واضغط «تأكيد الموقع» قبل الإرسال.',
          ),
        ),
      );
      return;
    }

    final registeredPhone = await _registeredPhoneFuture;
    if ((registeredPhone ?? '').trim().isEmpty) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'رقم الهاتف المسجّل غير متوفر على الحساب. حدّث بياناتك أولاً.',
          ),
        ),
      );
      return;
    }

    final altPhone = normalizePhone(_contactPhoneController.text);
    if (altPhone.isNotEmpty) {
      final phoneError = phoneValidationMessage(altPhone);
      if (phoneError != null) {
        if (!mounted) {
          return;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(phoneError)),
        );
        return;
      }
    }

    if (!mounted) {
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
        customerContactPhone: altPhone.isEmpty ? null : altPhone,
        deliveryLatitude: _deliveryType == 'delivery'
            ? _deliveryCoords?.latitude
            : null,
        deliveryLongitude: _deliveryType == 'delivery'
            ? _deliveryCoords?.longitude
            : null,
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
