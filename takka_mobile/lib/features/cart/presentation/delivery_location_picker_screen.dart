import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

import '../../../core/location/maps_links.dart';

class DeliveryCoords {
  const DeliveryCoords({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;
}

/// Full-screen map to detect / search / drag-confirm a delivery pin.
class DeliveryLocationPickerScreen extends StatefulWidget {
  const DeliveryLocationPickerScreen({
    super.key,
    this.initial,
  });

  final DeliveryCoords? initial;

  @override
  State<DeliveryLocationPickerScreen> createState() =>
      _DeliveryLocationPickerScreenState();
}

class _DeliveryLocationPickerScreenState
    extends State<DeliveryLocationPickerScreen> {
  final _mapController = MapController();
  final _searchController = TextEditingController();

  late LatLng _pin;
  var _detecting = false;
  var _searching = false;
  var _showSearch = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    final hasInitial = widget.initial != null;
    _pin = LatLng(
      widget.initial?.latitude ?? obourMapCenterLat,
      widget.initial?.longitude ?? obourMapCenterLng,
    );
    if (hasInitial) {
      _status = 'الدبوس جاهز من عنوانك. عدّله إن لزم ثم أكّد.';
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _detectLocation(auto: true);
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _detectLocation({bool auto = false}) async {
    setState(() {
      _detecting = true;
      if (!auto) {
        _status = null;
      }
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _status = auto
              ? 'تعذر رصد موقعك. حرّك الدبوس على الخريطة ثم أكّد.'
              : 'الموقع مغلق على الجهاز. حرّك الدبوس يدويًا ثم أكّد.';
        });
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() {
          _status =
              'تعذر رصد موقعك الحالي. حرّك الدبوس على الخريطة أو ابحث عن العنوان.';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final next = LatLng(position.latitude, position.longitude);
      setState(() {
        _pin = next;
        _status = auto
            ? 'تم رصد موقعك. عدّل الدبوس إن لزم ثم أكّد.'
            : 'تم تحديث الموقع الحالي.';
      });
      _mapController.move(next, 16);
    } catch (_) {
      setState(() {
        _status =
            'تعذر رصد الموقع. حرّك الدبوس على الخريطة أو ابحث عن العنوان.';
      });
    } finally {
      if (mounted) {
        setState(() => _detecting = false);
      }
    }
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      return;
    }

    setState(() {
      _searching = true;
      _status = null;
    });

    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': '$query العبور مصر',
        'format': 'json',
        'limit': '1',
      });
      final response = await http.get(
        uri,
        headers: {'Accept': 'application/json'},
      );
      final results = jsonDecode(response.body) as List<dynamic>;
      if (results.isEmpty) {
        setState(() {
          _status = 'لا نتائج. حرّك الدبوس يدويًا.';
        });
        return;
      }
      final hit = results.first as Map<String, dynamic>;
      final next = LatLng(
        double.parse(hit['lat'].toString()),
        double.parse(hit['lon'].toString()),
      );
      setState(() {
        _pin = next;
        _status = 'نتيجة البحث جاهزة. أكّد الموقع.';
      });
      _mapController.move(next, 16);
    } catch (_) {
      setState(() {
        _status = 'تعذر البحث على الخريطة.';
      });
    } finally {
      if (mounted) {
        setState(() => _searching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('موقع التوصيل'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                FilledButton.tonalIcon(
                  onPressed: _detecting ? null : () => _detectLocation(),
                  icon: const Icon(Icons.my_location),
                  label: Text(_detecting ? 'جارٍ الرصد...' : 'موقعي'),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () {
                    setState(() => _showSearch = !_showSearch);
                  },
                  child: Text(_showSearch ? 'إخفاء البحث' : 'بحث'),
                ),
                const Spacer(),
                Text(
                  formatCoords(_pin.latitude, _pin.longitude),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
          if (_showSearch)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'ابحث عن موقع على الخريطة...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _searching ? null : _search,
                    icon: _searching
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.search),
                  ),
                ],
              ),
            ),
          if (_status != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: Text(
                _status!,
                style: TextStyle(
                  color: Colors.amber.shade900,
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
            ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _pin,
                    initialZoom: widget.initial != null ? 16 : 14,
                    onTap: (tapPosition, point) {
                      setState(() {
                        _pin = point;
                        _status = 'حرّك الدبوس ثم اضغط «تأكيد الموقع».';
                      });
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.takka.mobile',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _pin,
                          width: 48,
                          height: 48,
                          child: const Icon(
                            Icons.location_on,
                            color: Color(0xFFE67E22),
                            size: 42,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'الدبوس جاهز من عنوانك إن وُجد. عدّله بالسحب أو النقر ثم أكّد مرة واحدة.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade700,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        Navigator.of(context).pop(
                          DeliveryCoords(
                            latitude: _pin.latitude,
                            longitude: _pin.longitude,
                          ),
                        );
                      },
                      child: const Text('تأكيد الموقع'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
