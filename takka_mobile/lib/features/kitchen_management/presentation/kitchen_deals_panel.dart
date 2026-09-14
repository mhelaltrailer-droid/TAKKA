import 'dart:async';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../data/kitchen_management_service.dart';

class KitchenDealsPanel extends StatefulWidget {
  const KitchenDealsPanel({super.key, required this.items});

  final List<KitchenManagedMenuItem> items;

  @override
  State<KitchenDealsPanel> createState() => _KitchenDealsPanelState();
}

class _KitchenDealsPanelState extends State<KitchenDealsPanel> {
  final _service = const KitchenManagementService();
  final _dishPriceController = TextEditingController();
  final _dishQtyController = TextEditingController();
  final _flashPriceController = TextEditingController();
  final _flashQtyController = TextEditingController(text: '10');

  String? _dishItemId;
  String? _flashItemId;
  int _flashHours = 1;
  KitchenDishOfTheDay? _dish;
  KitchenFlashOffer? _flash;
  String? _error;
  bool _loading = true;
  Timer? _ticker;
  Duration _remaining = Duration.zero;

  List<KitchenManagedMenuItem> get _approved => widget.items
      .where((item) => item.approvalStatus == 'APPROVED' && item.isAvailable)
      .toList();

  @override
  void initState() {
    super.initState();
    _load();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_flash == null || !mounted) return;
      final left = _flash!.endsAt.difference(DateTime.now());
      setState(() {
        _remaining = left.isNegative ? Duration.zero : left;
      });
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _dishPriceController.dispose();
    _dishQtyController.dispose();
    _flashPriceController.dispose();
    _flashQtyController.dispose();
    super.dispose();
  }

  Future<String> _token() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return token.jwt;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = await _token();
      final dish = await _service.loadDishOfTheDay(sessionToken: token);
      final flash = await _service.loadActiveFlashOffer(sessionToken: token);
      if (!mounted) return;
      setState(() {
        _dish = dish;
        _flash = flash;
        if (dish != null) {
          _dishItemId = dish.menuItemId;
          _dishPriceController.text = dish.dishOfTheDayPrice.toStringAsFixed(0);
          _dishQtyController.text = dish.dishOfTheDayQty?.toString() ?? '';
        }
        if (flash != null) {
          _remaining = flash.endsAt.difference(DateTime.now());
        }
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  String _formatCountdown(Duration d) {
    if (d.inSeconds <= 0) return 'انتهى';
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    if (h > 0) {
      return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _saveDish() async {
    if (_dishItemId == null) return;
    try {
      final token = await _token();
      final qtyText = _dishQtyController.text.trim();
      final dish = await _service.saveDishOfTheDay(
        sessionToken: token,
        menuItemId: _dishItemId!,
        dishOfTheDayPrice:
            double.tryParse(_dishPriceController.text.trim()) ?? 0,
        dishOfTheDayQty: qtyText.isEmpty ? null : int.tryParse(qtyText),
      );
      if (!mounted) return;
      setState(() => _dish = dish);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم حفظ طبق اليوم')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _clearDish() async {
    try {
      final token = await _token();
      await _service.clearDishOfTheDay(sessionToken: token);
      if (!mounted) return;
      setState(() {
        _dish = null;
        _dishItemId = null;
        _dishPriceController.clear();
        _dishQtyController.clear();
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _createFlash() async {
    if (_flashItemId == null) return;
    try {
      final token = await _token();
      final flash = await _service.createFlashOffer(
        sessionToken: token,
        menuItemId: _flashItemId!,
        offerPrice: double.tryParse(_flashPriceController.text.trim()) ?? 0,
        quantity: int.tryParse(_flashQtyController.text.trim()) ?? 0,
        durationHours: _flashHours,
      );
      if (!mounted) return;
      setState(() {
        _flash = flash;
        _remaining = flash.endsAt.difference(DateTime.now());
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _endFlash() async {
    if (_flash == null) return;
    try {
      final token = await _token();
      await _service.endFlashOffer(
        sessionToken: token,
        offerId: _flash!.id,
      );
      if (!mounted) return;
      setState(() => _flash = null);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'طبق اليوم',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                const Text(
                  'وجبة موحدة جاهزة للتسليم بسعر أقل تظهر للقريبين.',
                  style: TextStyle(fontSize: 12, height: 1.5),
                ),
                if (_dish != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    'النشط: ${_dish!.name} — ${_dish!.dishOfTheDayPrice.toStringAsFixed(0)} ج (بدل ${_dish!.basePrice.toStringAsFixed(0)})',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _dishItemId,
                  decoration: const InputDecoration(labelText: 'الصنف'),
                  items: _approved
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.id,
                          child: Text(
                            '${item.name} (${item.basePrice.toStringAsFixed(0)} ج)',
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _dishItemId = value),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _dishPriceController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration:
                      const InputDecoration(labelText: 'سعر طبق اليوم'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _dishQtyController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'الكمية (اختياري)',
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: _approved.isEmpty ? null : _saveDish,
                        child: const Text('حفظ طبق اليوم'),
                      ),
                    ),
                    if (_dish != null) ...[
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _clearDish,
                        child: const Text('إلغاء'),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'عرض سريع (Flash)',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                const Text(
                  'خصم لمدة ساعة أو ساعتين مع عدّاد. ينتهي تلقائيًا أو يدويًا.',
                  style: TextStyle(fontSize: 12, height: 1.5),
                ),
                if (_flash != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    '${_flash!.itemName} — ${_flash!.offerPrice.toStringAsFixed(0)} ج',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'متبقي ${_flash!.quantityLeft} · العدّاد: ${_formatCountdown(_remaining)}',
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: _endFlash,
                    child: const Text('إنهاء العرض الآن'),
                  ),
                ] else ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _flashItemId,
                    decoration: const InputDecoration(labelText: 'الصنف'),
                    items: _approved
                        .map(
                          (item) => DropdownMenuItem(
                            value: item.id,
                            child: Text(
                              '${item.name} (${item.basePrice.toStringAsFixed(0)} ج)',
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (value) => setState(() => _flashItemId = value),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _flashPriceController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'سعر العرض'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _flashQtyController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'الكمية'),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<int>(
                    initialValue: _flashHours,
                    decoration: const InputDecoration(labelText: 'المدة'),
                    items: const [
                      DropdownMenuItem(value: 1, child: Text('ساعة واحدة')),
                      DropdownMenuItem(value: 2, child: Text('ساعتان')),
                    ],
                    onChanged: (value) {
                      if (value != null) setState(() => _flashHours = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _approved.isEmpty ? null : _createFlash,
                    child: const Text('بدء العرض السريع'),
                  ),
                ],
              ],
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
      ],
    );
  }
}
