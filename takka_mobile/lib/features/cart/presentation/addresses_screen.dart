import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/location/obour_areas.dart';
import '../../../core/location/obour_location_picker.dart';
import '../../../core/theme/app_theme.dart';
import '../data/order_service.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final _service = const OrderService();
  final _labelController = TextEditingController();
  final _addressController = TextEditingController();
  final _landmarkController = TextEditingController();

  Future<List<CustomerAddress>>? _addressesFuture;
  ObourLocationSelection _location = const ObourLocationSelection(
    cityName: obourCityName,
    regionName: '',
  );
  var _isDefault = true;
  var _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _addressesFuture = _loadAddresses();
  }

  @override
  void dispose() {
    _labelController.dispose();
    _addressController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

  Future<List<CustomerAddress>> _loadAddresses() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _service.loadAddresses(sessionToken: token.jwt);
  }

  Future<void> _save() async {
    final locationError = assertObourLocation(
      _location.cityName,
      _location.regionName,
    );
    if (locationError != null) {
      setState(() => _error = locationError);
      return;
    }
    if (_labelController.text.trim().isEmpty ||
        _addressController.text.trim().isEmpty) {
      setState(() => _error = 'أدخل اسم العنوان والتفاصيل.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.createAddress(
        sessionToken: token.jwt,
        label: _labelController.text.trim(),
        cityName: obourCityName,
        regionName: _location.regionName,
        addressLine: _addressController.text.trim(),
        landmark: _landmarkController.text.trim().isEmpty
            ? null
            : _landmarkController.text.trim(),
        latitude: _location.latitude,
        longitude: _location.longitude,
        isDefault: _isDefault,
      );

      _labelController.clear();
      _addressController.clear();
      _landmarkController.clear();
      setState(() {
        _location = const ObourLocationSelection(
          cityName: obourCityName,
          regionName: '',
        );
        _isDefault = false;
        _addressesFuture = _loadAddresses();
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('عناوين التوصيل')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'إضافة عنوان',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _labelController,
                    decoration: const InputDecoration(
                      labelText: 'اسم العنوان',
                      hintText: 'منزل، عمل...',
                    ),
                  ),
                  const SizedBox(height: 12),
                  ObourLocationPicker(
                    initialRegionName: _location.regionName,
                    onChanged: (selection) {
                      setState(() => _location = selection);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _addressController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'العنوان التفصيلي',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _landmarkController,
                    decoration: const InputDecoration(
                      labelText: 'علامة مميزة (اختياري)',
                    ),
                  ),
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _isDefault,
                    onChanged: (value) {
                      setState(() => _isDefault = value ?? false);
                    },
                    title: const Text('تعيين كعنوان افتراضي'),
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Color(0xFFC62828)),
                      ),
                    ),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_saving ? 'جارٍ الحفظ...' : 'حفظ العنوان'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'عناويني',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 12),
          FutureBuilder<List<CustomerAddress>>(
            future: _addressesFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return Text(snapshot.error.toString());
              }
              final addresses = snapshot.data ?? const [];
              if (addresses.isEmpty) {
                return const Card(
                  child: Padding(
                    padding: EdgeInsets.all(18),
                    child: Text(
                      'لا توجد عناوين محفوظة بعد.',
                      style: TextStyle(color: TakkaColors.muted),
                    ),
                  ),
                );
              }
              return Column(
                children: addresses
                    .map(
                      (address) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          title: Text(
                            address.label,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          subtitle: Text(
                            '${address.cityName} - ${address.regionName}\n${address.addressLine}',
                          ),
                          isThreeLine: true,
                          trailing: address.isDefault
                              ? const Text(
                                  'افتراضي',
                                  style: TextStyle(
                                    color: Color(0xFF2E7D32),
                                    fontWeight: FontWeight.w700,
                                  ),
                                )
                              : null,
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
