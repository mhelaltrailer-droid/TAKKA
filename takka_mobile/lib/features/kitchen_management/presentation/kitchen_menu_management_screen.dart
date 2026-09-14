import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/kitchen/kitchen_onboarding_copy.dart';
import '../../../core/location/food_categories.dart';
import '../../../core/network/mobile_upload_service.dart';
import '../../../core/orders/order_readiness.dart';
import '../../../core/theme/app_theme.dart';
import '../data/kitchen_management_service.dart';
import 'kitchen_deals_panel.dart';
import 'kitchen_onboarding_screen.dart';

class KitchenMenuManagementScreen extends StatefulWidget {
  const KitchenMenuManagementScreen({super.key});

  @override
  State<KitchenMenuManagementScreen> createState() =>
      _KitchenMenuManagementScreenState();
}

class _KitchenMenuManagementScreenState
    extends State<KitchenMenuManagementScreen> {
  final _service = const KitchenManagementService();
  final _uploadService = MobileUploadService();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _depositController = TextEditingController();
  final _imageController = TextEditingController();

  String? _categoryId;
  String _orderReadiness = orderReadinessOptions.first.id;
  Future<_MenuPageData>? _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _depositController.dispose();
    _imageController.dispose();
    super.dispose();
  }

  Future<_MenuPageData> _load() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    final profile = await _service.loadProfile(sessionToken: token.jwt);
    final items = await _service.loadMenuItems(sessionToken: token.jwt);
    return _MenuPageData(
      kitchenApproved: profile?.approvalStatus == 'APPROVED',
      items: items,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إدارة المنيو'),
      ),
      body: FutureBuilder<_MenuPageData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                snapshot.error.toString(),
                textAlign: TextAlign.center,
              ),
            );
          }

          final approved = snapshot.data?.kitchenApproved ?? false;
          final items = snapshot.data?.items ?? const <KitchenManagedMenuItem>[];

          if (!approved) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Card(
                color: const Color(0xFFFFF8E1),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        kitchenMenuAwaitApprovalTitle,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: TakkaColors.ink,
                        ),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        kitchenMenuAwaitApprovalBody,
                        textAlign: TextAlign.center,
                        style: TextStyle(height: 1.6, fontSize: 15),
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => const KitchenOnboardingScreen(),
                            ),
                          );
                        },
                        child: const Text(kitchenMenuGoToOnboarding),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              KitchenDealsPanel(items: items),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'إضافة صنف جديد',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'يُرسل الصنف للاعتماد قبل ظهوره للعملاء.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF7A5644)),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _nameController,
                        decoration:
                            const InputDecoration(labelText: 'اسم الصنف'),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: _categoryId,
                        decoration: const InputDecoration(
                          labelText: 'فئة الوجبة (تاكل ايه؟)',
                        ),
                        items: foodCategories
                            .map(
                              (category) => DropdownMenuItem(
                                value: category.id,
                                child: Text(
                                  '${category.thumb} ${category.label}',
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          setState(() => _categoryId = value);
                        },
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: _orderReadiness,
                        decoration: const InputDecoration(
                          labelText: orderReadinessFieldLabel,
                          helperText: 'يظهر للعميل كـ «متى يكون جاهز؟»',
                        ),
                        items: orderReadinessOptions
                            .map(
                              (option) => DropdownMenuItem(
                                value: option.id,
                                child: Text(option.label),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() => _orderReadiness = value);
                        },
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _descriptionController,
                        maxLines: 3,
                        decoration: const InputDecoration(labelText: 'الوصف'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _priceController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(labelText: 'السعر'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _depositController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration:
                            const InputDecoration(labelText: 'العربون'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _imageController,
                        decoration: const InputDecoration(
                          labelText: 'رابط صورة الصنف',
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: _uploadMenuItemImage,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('اختيار ورفع صورة الصنف'),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _createItem,
                        child: const Text('إرسال للاعتماد'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (items.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('لا توجد أصناف بعد.'),
                  ),
                )
              else
                ...items.map(
                  (item) => Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(18),
                      title: Text(
                        item.name,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${_categoryLabel(item.categoryId)} · ${_approvalLabel(item)}'
                          '${item.isDishOfTheDay ? ' · طبق اليوم' : ''}\n'
                          '$orderReadinessFieldLabel: ${orderReadinessLabel(item.orderReadiness)}\n'
                          'السعر: ${item.basePrice.toStringAsFixed(0)} ج.م | العربون: ${item.depositAmount.toStringAsFixed(0)} ج.م'
                          '${item.rejectionReason != null && item.rejectionReason!.isNotEmpty ? '\nسبب الرفض: ${item.rejectionReason}' : ''}'
                          '${item.draftRejectionReason != null && item.draftRejectionReason!.isNotEmpty ? '\nسبب رفض التعديل: ${item.draftRejectionReason}' : ''}',
                          style: const TextStyle(height: 1.45),
                        ),
                      ),
                      trailing: Wrap(
                        spacing: 8,
                        children: [
                          Switch(
                            value: item.isAvailable,
                            onChanged: item.approvalStatus == 'APPROVED'
                                ? (value) => _toggleItem(item.id, value)
                                : null,
                          ),
                          IconButton(
                            onPressed: () => _deleteItem(item.id),
                            icon: const Icon(Icons.delete_outline_rounded),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  String _approvalLabel(KitchenManagedMenuItem item) {
    if (item.draftStatus == 'PENDING') {
      return 'تعديل بانتظار الاعتماد';
    }
    if (item.draftStatus == 'REJECTED') {
      return 'تعديل مرفوض';
    }
    switch (item.approvalStatus) {
      case 'APPROVED':
        return 'معتمد';
      case 'REJECTED':
        return 'مرفوض';
      default:
        return 'بانتظار الاعتماد';
    }
  }

  String _categoryLabel(String categoryId) {
    for (final category in foodCategories) {
      if (category.id == categoryId) {
        return category.label;
      }
    }
    return categoryId;
  }

  Future<void> _createItem() async {
    if (_categoryId == null || _categoryId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختر فئة الوجبة قبل الإضافة.')),
      );
      return;
    }

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.createMenuItem(
        sessionToken: token.jwt,
        payload: {
          'name': _nameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'categoryId': _categoryId,
          'orderReadiness': _orderReadiness,
          'basePrice': double.tryParse(_priceController.text.trim()) ?? 0,
          'depositAmount':
              double.tryParse(_depositController.text.trim()) ?? 0,
          'imageUrl': _imageController.text.trim(),
          'sizes': <Map<String, dynamic>>[],
        },
      );

      _nameController.clear();
      _descriptionController.clear();
      _priceController.clear();
      _depositController.clear();
      _imageController.clear();
      setState(() {
        _categoryId = null;
        _orderReadiness = orderReadinessOptions.first.id;
        _future = _load();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _toggleItem(String id, bool value) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.updateAvailability(
        sessionToken: token.jwt,
        menuItemId: id,
        isAvailable: value,
      );
      setState(() => _future = _load());
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _deleteItem(String id) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.deleteMenuItem(
        sessionToken: token.jwt,
        menuItemId: id,
      );
      setState(() => _future = _load());
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  Future<void> _uploadMenuItemImage() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
        purpose: 'menuItemImage',
      );

      if (url != null && mounted) {
        _imageController.text = url;
        setState(() {});
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }
}

class _MenuPageData {
  const _MenuPageData({
    required this.kitchenApproved,
    required this.items,
  });

  final bool kitchenApproved;
  final List<KitchenManagedMenuItem> items;
}
