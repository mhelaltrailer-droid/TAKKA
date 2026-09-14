import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'maps_links.dart';

/// Customer-facing kitchen pin actions (same pattern as kitchen order map buttons).
class KitchenLocationActions extends StatelessWidget {
  const KitchenLocationActions({
    super.key,
    required this.latitude,
    required this.longitude,
    this.addressLine,
    this.regionLabel,
  });

  final double? latitude;
  final double? longitude;
  final String? addressLine;
  final String? regionLabel;

  bool get _hasCoords {
    final lat = latitude;
    final lng = longitude;
    return lat != null &&
        lng != null &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180;
  }

  String get _fullAddress {
    return [
      addressLine?.trim(),
      regionLabel?.trim(),
    ].where((part) => part != null && part.isNotEmpty).join(' · ');
  }

  Future<void> _copy(BuildContext context, String text, String success) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(success)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mapsUrl = _hasCoords
        ? googleMapsShareUrl(latitude!, longitude!)
        : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'موقع المطبخ',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'شوف موقع المطبخ على الخريطة عشان تقرر: توصيل ولا استلام بنفسك؟',
              style: TextStyle(
                color: Colors.grey.shade700,
                height: 1.45,
                fontSize: 13,
              ),
            ),
            if (_fullAddress.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                _fullAddress,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  height: 1.4,
                ),
              ),
            ],
            if (_hasCoords && mapsUrl != null) ...[
              const SizedBox(height: 8),
              Text(
                'الإحداثيات: ${formatCoords(latitude!, longitude!)}',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => _copy(
                  context,
                  mapsUrl,
                  'تم نسخ رابط موقع المطبخ (Google Maps)',
                ),
                icon: const Icon(Icons.copy_all_outlined),
                label: const Text('نسخ عنوان الخريطة'),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await launchUrl(
                          Uri.parse(mapsUrl),
                          mode: LaunchMode.externalApplication,
                        );
                      },
                      icon: const Icon(Icons.map_outlined),
                      label: const Text('عرض على الخريطة'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _copy(
                        context,
                        _fullAddress.isNotEmpty
                            ? _fullAddress
                            : formatCoords(latitude!, longitude!),
                        'تم نسخ العنوان',
                      ),
                      icon: const Icon(Icons.copy_outlined),
                      label: const Text('نسخ العنوان'),
                    ),
                  ),
                ],
              ),
            ] else ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Text(
                  _fullAddress.isNotEmpty
                      ? 'الموقع على الخريطة غير متاح لهذا المطبخ حاليًا. يمكنك الاعتماد على العنوان النصي أعلاه.'
                      : 'الموقع على الخريطة غير متاح لهذا المطبخ حاليًا.',
                  style: const TextStyle(
                    color: Color(0xFF78350F),
                    height: 1.45,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
