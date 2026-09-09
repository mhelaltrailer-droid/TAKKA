import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/app_theme.dart';
import 'obour_areas.dart';

const _selectedDistrictKey = 'takka.selectedObourDistrict';
const _currentDistrictKey = 'takka.currentObourDistrict';
const _locationModeKey = 'takka.deliveryLocationMode';

enum _LocationMode { current, other }

class DeliveryLocationHeader extends StatefulWidget {
  const DeliveryLocationHeader({
    super.key,
    required this.onDistrictChanged,
  });

  final ValueChanged<String> onDistrictChanged;

  @override
  State<DeliveryLocationHeader> createState() => _DeliveryLocationHeaderState();
}

class _DeliveryLocationHeaderState extends State<DeliveryLocationHeader> {
  String _selectedDistrict = '';
  String _currentDistrict = '';
  _LocationMode _mode = _LocationMode.current;

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final selected = prefs.getString(_selectedDistrictKey) ?? '';
    final current = prefs.getString(_currentDistrictKey) ?? '';
    final modeRaw = prefs.getString(_locationModeKey);
    final mode = modeRaw == 'other' ? _LocationMode.other : _LocationMode.current;

    if (!mounted) return;
    setState(() {
      _selectedDistrict = selected;
      _currentDistrict = current.isNotEmpty ? current : selected;
      _mode = mode;
    });
    if (selected.isNotEmpty) {
      widget.onDistrictChanged(selected);
    }
  }

  Future<void> _persist({
    required String selected,
    required String current,
    required _LocationMode mode,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_selectedDistrictKey, selected);
    await prefs.setString(_currentDistrictKey, current);
    await prefs.setString(
      _locationModeKey,
      mode == _LocationMode.other ? 'other' : 'current',
    );
    if (!mounted) return;
    setState(() {
      _selectedDistrict = selected;
      _currentDistrict = current;
      _mode = mode;
    });
    widget.onDistrictChanged(selected);
  }

  Future<void> _openSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return _DeliveryLocationSheet(
          selectedDistrict: _selectedDistrict,
          currentDistrict: _currentDistrict,
          mode: _mode,
          onApply: (selected, current, mode) async {
            Navigator.of(context).pop();
            await _persist(
              selected: selected,
              current: current,
              mode: mode,
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: _openSheet,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'التوصيل / الاستلام في',
              style: TextStyle(
                color: TakkaColors.muted,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _selectedDistrict.isEmpty ? 'اختر الحي' : _selectedDistrict,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: TakkaColors.muted,
                ),
              ],
            ),
            const Text(
              obourCityName,
              style: TextStyle(color: TakkaColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _DeliveryLocationSheet extends StatefulWidget {
  const _DeliveryLocationSheet({
    required this.selectedDistrict,
    required this.currentDistrict,
    required this.mode,
    required this.onApply,
  });

  final String selectedDistrict;
  final String currentDistrict;
  final _LocationMode mode;
  final void Function(String selected, String current, _LocationMode mode)
      onApply;

  @override
  State<_DeliveryLocationSheet> createState() => _DeliveryLocationSheetState();
}

class _DeliveryLocationSheetState extends State<_DeliveryLocationSheet> {
  late _LocationMode _mode;
  late String _currentDistrict;
  late String _otherDistrict;
  var _pickingOther = false;
  var _pickingCurrent = false;
  List<String> _districts = defaultObourDistricts;
  var _loadingDistricts = true;

  @override
  void initState() {
    super.initState();
    _mode = widget.mode;
    _currentDistrict = widget.currentDistrict;
    _otherDistrict = widget.mode == _LocationMode.other
        ? widget.selectedDistrict
        : '';
    if (_mode == _LocationMode.other && _otherDistrict.isEmpty) {
      _pickingOther = true;
    }
    if (_mode == _LocationMode.current && _currentDistrict.isEmpty) {
      _pickingCurrent = true;
    }
    _loadDistricts();
  }

  Future<void> _loadDistricts() async {
    final districts = await loadObourDistricts();
    if (!mounted) return;
    setState(() {
      _districts = districts;
      _loadingDistricts = false;
    });
  }

  void _selectCurrent() {
    if (_currentDistrict.isEmpty) {
      setState(() {
        _mode = _LocationMode.current;
        _pickingCurrent = true;
        _pickingOther = false;
      });
      return;
    }
    widget.onApply(_currentDistrict, _currentDistrict, _LocationMode.current);
  }

  void _openOtherPicker() {
    setState(() {
      _mode = _LocationMode.other;
      _pickingOther = true;
      _pickingCurrent = false;
    });
  }

  void _pickDistrict(String district) {
    if (_pickingCurrent) {
      widget.onApply(district, district, _LocationMode.current);
      return;
    }
    widget.onApply(district, _currentDistrict, _LocationMode.other);
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded),
              ),
              const Expanded(
                child: Text(
                  'التوصيل / الاستلام في',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 48),
            ],
          ),
          const SizedBox(height: 8),
          if (_pickingOther || _pickingCurrent) ...[
            Text(
              _pickingCurrent
                  ? 'حدّد حيّك الحالي'
                  : 'اختر حيًا آخر للتوصيل / الاستلام',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 12),
            if (_loadingDistricts)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              )
            else
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(context).height * 0.45,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _districts.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final district = _districts[index];
                    final selected = _pickingCurrent
                        ? district == _currentDistrict
                        : district == _otherDistrict;
                    return _DistrictTile(
                      label: district,
                      selected: selected,
                      onTap: () => _pickDistrict(district),
                    );
                  },
                ),
              ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                setState(() {
                  _pickingOther = false;
                  _pickingCurrent = false;
                });
              },
              child: const Text('رجوع'),
            ),
          ] else ...[
            _LocationOptionCard(
              title: 'التوصيل إلى موقع آخر',
              subtitle: 'اختر حيًا آخر من مدينة العبور',
              leading: Icons.location_on_outlined,
              trailing: Icons.chevron_left_rounded,
              selected: _mode == _LocationMode.other,
              onTap: _openOtherPicker,
            ),
            const SizedBox(height: 12),
            _LocationOptionCard(
              title: 'التوصيل إلى الموقع الحالي',
              subtitle: _currentDistrict.isEmpty
                  ? 'حدّد حيّك الحالي في مدينة العبور'
                  : '$_currentDistrict، $obourCityName',
              leading: Icons.my_location_rounded,
              trailing: Icons.check_circle_rounded,
              selected: _mode == _LocationMode.current &&
                  _currentDistrict.isNotEmpty,
              onTap: _selectCurrent,
            ),
          ],
        ],
      ),
    );
  }
}

class _LocationOptionCard extends StatelessWidget {
  const _LocationOptionCard({
    required this.title,
    required this.subtitle,
    required this.leading,
    required this.trailing,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData leading;
  final IconData trailing;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? TakkaColors.primary : TakkaColors.softLine,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              // RTL: first child sits on the right (pin), last on the left (check).
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: TakkaColors.softLine),
                ),
                child: Icon(leading, color: TakkaColors.ink),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: TakkaColors.muted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Icon(
                trailing,
                color: selected ? TakkaColors.primary : TakkaColors.muted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DistrictTile extends StatelessWidget {
  const _DistrictTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? TakkaColors.primary : TakkaColors.softLine,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle_rounded, color: TakkaColors.primary),
            ],
          ),
        ),
      ),
    );
  }
}
