import 'package:flutter/material.dart';

import '../images/image_display_settings.dart';

/// Display-time watermark overlay (not burned into the stored file).
class WatermarkedNetworkImage extends StatelessWidget {
  const WatermarkedNetworkImage({
    super.key,
    required this.imageUrl,
    this.kitchenName,
    this.fit = BoxFit.cover,
    this.enabled = true,
    this.position = WatermarkPosition.bottomLeft,
    this.borderRadius,
  });

  final String imageUrl;
  final String? kitchenName;
  final BoxFit fit;
  final bool enabled;
  final WatermarkPosition position;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final image = Image.network(
      imageUrl,
      fit: fit,
      width: double.infinity,
      height: double.infinity,
      errorBuilder: (_, _, _) => Container(
        color: Colors.black12,
        alignment: Alignment.center,
        child: const Icon(Icons.broken_image_outlined),
      ),
    );

    Widget child = image;
    if (enabled) {
      child = Stack(
        fit: StackFit.expand,
        children: [
          image,
          Positioned(
            left: position == WatermarkPosition.bottomLeft ||
                    position == WatermarkPosition.topLeft
                ? 8
                : null,
            right: position == WatermarkPosition.bottomRight ||
                    position == WatermarkPosition.topRight
                ? 8
                : null,
            top: position == WatermarkPosition.topLeft ||
                    position == WatermarkPosition.topRight
                ? 8
                : null,
            bottom: position == WatermarkPosition.bottomLeft ||
                    position == WatermarkPosition.bottomRight
                ? 8
                : null,
            child: IgnorePointer(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 140),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 4,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'تكة',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            height: 1.1,
                          ),
                        ),
                        if (kitchenName != null &&
                            kitchenName!.trim().isNotEmpty)
                          Text(
                            kitchenName!.trim(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 9,
                              height: 1.15,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}
