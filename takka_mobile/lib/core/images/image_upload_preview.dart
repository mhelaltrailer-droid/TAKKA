import 'dart:typed_data';

import 'package:flutter/material.dart';

/// Lets the kitchen choose original (crop+compress) vs lightly enhanced.
Future<Uint8List?> showImageUploadPreview({
  required BuildContext context,
  required Uint8List originalBytes,
  required Uint8List enhancedBytes,
}) {
  return showModalBottomSheet<Uint8List>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) {
      return _ImageUploadPreviewSheet(
        originalBytes: originalBytes,
        enhancedBytes: enhancedBytes,
      );
    },
  );
}

class _ImageUploadPreviewSheet extends StatefulWidget {
  const _ImageUploadPreviewSheet({
    required this.originalBytes,
    required this.enhancedBytes,
  });

  final Uint8List originalBytes;
  final Uint8List enhancedBytes;

  @override
  State<_ImageUploadPreviewSheet> createState() =>
      _ImageUploadPreviewSheetState();
}

class _ImageUploadPreviewSheetState extends State<_ImageUploadPreviewSheet> {
  /// false = original, true = enhanced
  bool _useEnhanced = true;

  @override
  Widget build(BuildContext context) {
    final bytes =
        _useEnhanced ? widget.enhancedBytes : widget.originalBytes;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'معاينة قبل الرفع',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'اختَر الصورة الأصلية أو المحسّنة. التحسين خفيف (سطوع/تباين) بدون تغيير ألوان الأكل.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.black54,
                  height: 1.45,
                ),
          ),
          const SizedBox(height: 14),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment<bool>(
                value: false,
                label: Text('الصورة الأصلية'),
                icon: Icon(Icons.image_outlined, size: 18),
              ),
              ButtonSegment<bool>(
                value: true,
                label: Text('المحسّنة'),
                icon: Icon(Icons.auto_fix_high_outlined, size: 18),
              ),
            ],
            selected: {_useEnhanced},
            onSelectionChanged: (next) {
              setState(() => _useEnhanced = next.first);
            },
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.memory(
                bytes,
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(bytes),
            child: const Text('رفع هذه الصورة'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('إلغاء'),
          ),
        ],
      ),
    );
  }
}
