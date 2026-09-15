import 'dart:async';

import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/location/food_categories.dart';
import '../data/kitchen_management_service.dart';

class KitchenDealsPanel extends StatefulWidget {
  const KitchenDealsPanel({
    super.key,
    required this.items,
    this.onChanged,
  });

  final List<KitchenManagedMenuItem> items;
  final VoidCallback? onChanged;

  @override
  State<KitchenDealsPanel> createState() => _KitchenDealsPanelState();
}

class _KitchenDealsPanelState extends State<KitchenDealsPanel> {
  final _service = const KitchenManagementService();
  final _dishPriceController = TextEditingController();
  final _dishQtyController = TextEditingController();
  final _flashPriceController = TextEditingController();
  final _flashQtyController = TextEditingController(text: '10');
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _basePriceController = TextEditingController();
  final _depositController = TextEditingController(text: '0');

  String? _dishItemId;
  String? _flashItemId;
  int _flashHours = 1;
  KitchenDishOfTheDay? _dish;
  KitchenFlashOffer? _flash;
  String? _error;
  String? _info;
  bool _loading = true;
  bool _showCreate = false;
  String? _editItemId;
  String _categoryId = 'meals';
  Timer? _ticker;
  Duration _remaining = Duration.zero;

  List<KitchenManagedMenuItem> get _items => widget.items;

  List<KitchenManagedMenuItem> get _approved =>
      _items.where((item) => item.approvalStatus == 'APPROVED').toList();

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
    _nameController.dispose();
    _descriptionController.dispose();
    _basePriceController.dispose();
    _depositController.dispose();
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

  void _resetForm() {
    _editItemId = null;
    _showCreate = false;
    _nameController.clear();
    _descriptionController.clear();
    _basePriceController.clear();
    _depositController.text = '0';
    _categoryId = 'meals';
  }

  void _fillEdit(KitchenManagedMenuItem item) {
    setState(() {
      _showCreate = false;
      _editItemId = item.id;
      _nameController.text = item.name;
      _descriptionController.text = item.description ?? '';
      _basePriceController.text = item.basePrice.toStringAsFixed(0);
      _depositController.text = item.depositAmount.toStringAsFixed(0);
      _categoryId = item.categoryId;
    });
  }

  Future<void> _createHiddenItem() async {
    try {
      final token = await _token();
      await _service.createMenuItem(
        sessionToken: token,
        payload: {
          'name': _nameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'categoryId': _categoryId,
          'orderReadiness': 'AVAILABLE_NOW',
          'basePrice': double.tryParse(_basePriceController.text.trim()) ?? 0,
          'depositAmount': double.tryParse(_depositController.text.trim()) ?? 0,
          'startHidden': true,
          'sizes': <Map<String, dynamic>>[],
        },
      );
      if (!mounted) return;
      setState(() {
        _info =
            'تم حفظ الصنف مخفيًا وإرساله للاعتماد. بعد الاعتماد يمكن تعيينه كطبق يوم أو فلاش.';
        _error = null;
        _resetForm();
      });
      widget.onChanged?.call();
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  Future<void> _saveEdits() async {
    if (_editItemId == null) return;
    try {
      final token = await _token();
      await _service.updateMenuItem(
        sessionToken: token,
        payload: {
          'id': _editItemId,
          'name': _nameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'categoryId': _categoryId,
          'orderReadiness': 'AVAILABLE_NOW',
          'basePrice': double.tryParse(_basePriceController.text.trim()) ?? 0,
          'depositAmount': double.tryParse(_depositController.text.trim()) ?? 0,
          'sizes': <Map<String, dynamic>>[],
        },
      );
      if (!mounted) return;
      setState(() {
        _info = 'تم إرسال التعديل للاعتماد.';
        _error = null;
        _resetForm();
      });
      widget.onChanged?.call();
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  Future<void> _toggleVisibility(KitchenManagedMenuItem item) async {
    try {
      final token = await _token();
      await _service.updateAvailability(
        sessionToken: token,
        menuItemId: item.id,
        isAvailable: !item.isAvailable,
      );
      widget.onChanged?.call();
      await _load();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
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
      setState(() {
        _dish = dish;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
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
      setState(() => _error = error.toString());
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
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  Future<void> _endFlash() async {
    if (_flash == null) return;
    try {
      final token = await _token();
      await _service.endFlashOffer(sessionToken: token, offerId: _flash!.id);
      if (!mounted) return;
      setState(() => _flash = null);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    }
  }

  String _statusLabel(KitchenManagedMenuItem item) {
    if (item.approvalStatus == 'PENDING') return 'بانتظار الاعتماد';
    if (item.approvalStatus == 'REJECTED') return 'مرفوض';
    if (item.draftStatus == 'PENDING') return 'تعديل بانتظار الاعتماد';
    return item.isAvailable ? 'ظاهر في المنيو' : 'مخفي عن المنيو';
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
                  'طبق اليوم والعروض السريعة',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                const Text(
                  'اختر صنفًا معتمدًا (ظاهر أو مخفي) أو أضف صنفًا جديدًا مخفيًا يُرسل للاعتماد. عدّل التفاصيل قبل التعيين.',
                  style: TextStyle(fontSize: 12, height: 1.5),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    FilledButton(
                      onPressed: () {
                        setState(() {
                          _resetForm();
                          _showCreate = true;
                        });
                      },
                      child: const Text('إضافة صنف جديد للعروض'),
                    ),
                    if (_showCreate || _editItemId != null)
                      OutlinedButton(
                        onPressed: () => setState(_resetForm),
                        child: const Text('إلغاء'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (_showCreate || _editItemId != null) ...[
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _showCreate
                        ? 'صنف جديد (مخفي + اعتماد)'
                        : 'تعديل تفاصيل الصنف',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'اسم الصنف'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'الوصف'),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    initialValue: _categoryId,
                    decoration: const InputDecoration(labelText: 'الفئة'),
                    items: foodCategories
                        .map(
                          (c) => DropdownMenuItem(
                            value: c.id,
                            child: Text('${c.thumb} ${c.label}'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) setState(() => _categoryId = value);
                    },
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _basePriceController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration:
                        const InputDecoration(labelText: 'السعر الأساسي'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _depositController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'العربون'),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _showCreate ? _createHiddenItem : _saveEdits,
                    child: Text(
                      _showCreate
                          ? 'حفظ وإرسال للاعتماد'
                          : 'حفظ التعديل للاعتماد',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'أصناف المطبخ',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                if (_items.isEmpty)
                  const Text('لا توجد أصناف بعد.')
                else
                  ..._items.map(
                    (item) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item.name),
                      subtitle: Text(
                        '${item.basePrice.toStringAsFixed(0)} ج · ${_statusLabel(item)}',
                      ),
                      trailing: Wrap(
                        spacing: 4,
                        children: [
                          IconButton(
                            onPressed: () => _fillEdit(item),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                          if (item.approvalStatus == 'APPROVED')
                            IconButton(
                              onPressed: () => _toggleVisibility(item),
                              icon: Icon(
                                item.isAvailable
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                              ),
                            ),
                        ],
                      ),
                    ),
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
                  'طبق اليوم',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                if (_dish != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    'النشط: ${_dish!.name} — ${_dish!.dishOfTheDayPrice.toStringAsFixed(0)} ج',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _dishItemId,
                  decoration: const InputDecoration(labelText: 'الصنف المعتمد'),
                  items: _approved
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.id,
                          child: Text(
                            '${item.name} (${item.basePrice.toStringAsFixed(0)} ج)${item.isAvailable ? '' : ' · مخفي'}',
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
                              '${item.name} (${item.basePrice.toStringAsFixed(0)} ج)${item.isAvailable ? '' : ' · مخفي'}',
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
        if (_info != null) ...[
          const SizedBox(height: 8),
          Text(_info!, style: const TextStyle(color: Color(0xFF0369A1))),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
      ],
    );
  }
}
