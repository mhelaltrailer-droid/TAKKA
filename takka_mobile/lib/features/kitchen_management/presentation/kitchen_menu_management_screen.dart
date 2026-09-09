import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/location/food_categories.dart';
import '../../../core/network/mobile_upload_service.dart';
import '../data/kitchen_management_service.dart';

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
  Future<List<KitchenManagedMenuItem>>? _future;

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

  Future<List<KitchenManagedMenuItem>> _load() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _service.loadMenuItems(sessionToken: token.jwt);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إدارة المنيو'),
      ),
      body: FutureBuilder<List<KitchenManagedMenuItem>>(
        future: _future,
        builder: (context, snapshot) {
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
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
                      const SizedBox(height: 6),
                      const Text(
                        'الفئة مطلوبة حتى تظهر الوجبة في البحث وقسم تاكل ايه؟',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7A5644),
                        ),
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
                        decoration: const InputDecoration(labelText: 'العربون'),
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
                        child: const Text('إضافة الصنف'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (snapshot.connectionState != ConnectionState.done)
                const Center(child: CircularProgressIndicator())
              else if (snapshot.hasError)
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    snapshot.error.toString(),
                    textAlign: TextAlign.center,
                  ),
                )
              else if ((snapshot.data ?? const []).isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('لا توجد أصناف بعد.'),
                  ),
                )
              else
                ...(snapshot.data ?? const []).map(
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
                          '${_categoryLabel(item.categoryId)} · السعر: ${item.basePrice.toStringAsFixed(0)} ج.م | العربون: ${item.depositAmount.toStringAsFixed(0)} ج.م',
                        ),
                      ),
                      trailing: Wrap(
                        spacing: 8,
                        children: [
                          Switch(
                            value: item.isAvailable,
                            onChanged: (value) =>
                                _toggleItem(item.id, value),
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
        purpose: 'menuItem',
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
