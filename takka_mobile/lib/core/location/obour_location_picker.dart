import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../theme/app_theme.dart';
import 'obour_areas.dart';

class ObourLocationSelection {
  const ObourLocationSelection({
    required this.cityName,
    required this.regionName,
    this.latitude,
    this.longitude,
  });

  final String cityName;
  final String regionName;
  final double? latitude;
  final double? longitude;
}

class ObourLocationPicker extends StatefulWidget {
  const ObourLocationPicker({
    super.key,
    this.initialRegionName = '',
    this.initialLatitude,
    this.initialLongitude,
    required this.onChanged,
    this.showDetectButton = true,
  });

  final String initialRegionName;
  final double? initialLatitude;
  final double? initialLongitude;
  final ValueChanged<ObourLocationSelection> onChanged;
  final bool showDetectButton;

  @override
  State<ObourLocationPicker> createState() => _ObourLocationPickerState();
}

class _ObourLocationPickerState extends State<ObourLocationPicker> {
  String? _regionName;
  double? _latitude;
  double? _longitude;
  String? _status;
  var _detecting = false;
  List<String> _districts = defaultObourDistricts;
  var _loadingDistricts = true;

  @override
  void initState() {
    super.initState();
    _regionName =
        widget.initialRegionName.isEmpty ? null : widget.initialRegionName;
    _latitude = widget.initialLatitude;
    _longitude = widget.initialLongitude;
    _loadDistricts();
  }

  Future<void> _loadDistricts() async {
    final districts = await loadObourDistricts();
    if (!mounted) return;
    setState(() {
      _districts = districts;
      _loadingDistricts = false;
      if (_regionName != null && !_districts.contains(_regionName)) {
        _regionName = null;
      }
    });
  }

  void _emit() {
    widget.onChanged(
      ObourLocationSelection(
        cityName: obourCityName,
        regionName: _regionName ?? '',
        latitude: _latitude,
        longitude: _longitude,
      ),
    );
  }

  Future<void> _detectLocation() async {
    setState(() {
      _detecting = true;
      _status = null;
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _status = 'فعّل خدمة الموقع من إعدادات الجهاز.');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() => _status = 'تعذر الحصول على إذن الموقع. اختر الحي يدويًا.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _status = 'تم تحديد موقعك. اختر الحي يدويًا من القائمة.';
      });
      _emit();
    } catch (_) {
      setState(() => _status = 'تعذر تحديد الموقع. اختر الحي يدويًا.');
    } finally {
      if (mounted) {
        setState(() => _detecting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = _regionName != null && _districts.contains(_regionName)
        ? _regionName
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'المدينة',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        InputDecorator(
          decoration: const InputDecoration(),
          child: Text(
            obourCityName,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'الحي / المنطقة',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        if (_loadingDistricts)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          )
        else
          DropdownButtonFormField<String>(
            initialValue: selected,
            decoration: const InputDecoration(hintText: 'اختر الحي'),
            items: _districts
                .map(
                  (district) => DropdownMenuItem(
                    value: district,
                    child: Text(district),
                  ),
                )
                .toList(),
            onChanged: (value) {
              setState(() => _regionName = value);
              _emit();
            },
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'اختر الحي';
              }
              return null;
            },
          ),
        if (widget.showDetectButton) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _detecting ? null : _detectLocation,
            icon: _detecting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location_rounded),
            label: Text(
              _detecting ? 'جارٍ تحديد الموقع...' : 'تحديد موقعي الحالي',
            ),
          ),
          if (_status != null) ...[
            const SizedBox(height: 8),
            Text(
              _status!,
              style: const TextStyle(color: TakkaColors.muted, height: 1.5),
            ),
          ],
          if (_latitude != null && _longitude != null) ...[
            const SizedBox(height: 4),
            Text(
              'الإحداثيات: ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}',
              style: const TextStyle(color: Color(0xFF2E7D32), fontSize: 12),
            ),
          ],
        ],
      ],
    );
  }
}
