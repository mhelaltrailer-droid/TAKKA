import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

/// Fixed product rules — keep in sync with admin/src/lib/image-settings.ts.
const int kImageMaxLongEdge = 1280;
const int kImageExportQuality = 75;

const double kMenuItemAspect = 4 / 3;
const double kKitchenCoverAspect = 16 / 9;
const double kKitchenLogoAspect = 1;

bool isCroppablePurpose(String purpose) =>
    purpose == 'menuItemImage' ||
    purpose == 'kitchenCover' ||
    purpose == 'kitchenLogo';

bool isFoodEnhancePurpose(String purpose) =>
    purpose == 'menuItemImage' || purpose == 'kitchenCover';

double? aspectRatioForPurpose(String purpose) {
  switch (purpose) {
    case 'menuItemImage':
      return kMenuItemAspect;
    case 'kitchenCover':
      return kKitchenCoverAspect;
    case 'kitchenLogo':
      return kKitchenLogoAspect;
    default:
      return null;
  }
}

class ImageProcessRequest {
  const ImageProcessRequest({
    required this.bytes,
    required this.purpose,
    required this.enhance,
  });

  final Uint8List bytes;
  final String purpose;
  final bool enhance;
}

class ImageProcessResult {
  const ImageProcessResult({
    required this.originalBytes,
    required this.enhancedBytes,
    required this.contentType,
  });

  /// Resized (+ cropped when applicable), no color filters.
  final Uint8List originalBytes;

  /// Same as [originalBytes] when enhancement is off / not applicable.
  final Uint8List enhancedBytes;

  final String contentType;
}

/// Runs decode → crop → resize → optional light enhance in an isolate.
Future<ImageProcessResult> processUploadImage(ImageProcessRequest request) {
  return compute(_processUploadImageWorker, request);
}

ImageProcessResult _processUploadImageWorker(ImageProcessRequest request) {
  final decoded = img.decodeImage(request.bytes);
  if (decoded == null) {
    throw StateError('decode_failed');
  }

  var working = img.bakeOrientation(decoded);
  final aspect = aspectRatioForPurpose(request.purpose);
  if (aspect != null) {
    working = _centerCropAspect(working, aspect);
  }
  working = _fitMaxLongEdge(working, kImageMaxLongEdge);

  final originalBytes = Uint8List.fromList(
    img.encodeJpg(working, quality: kImageExportQuality),
  );

  if (!request.enhance || !isFoodEnhancePurpose(request.purpose)) {
    return ImageProcessResult(
      originalBytes: originalBytes,
      enhancedBytes: originalBytes,
      contentType: 'image/jpeg',
    );
  }

  final enhanced = _lightEnhance(working);
  final enhancedBytes = Uint8List.fromList(
    img.encodeJpg(enhanced, quality: kImageExportQuality),
  );

  return ImageProcessResult(
    originalBytes: originalBytes,
    enhancedBytes: enhancedBytes,
    contentType: 'image/jpeg',
  );
}

img.Image _centerCropAspect(img.Image src, double aspect) {
  if (src.width <= 0 || src.height <= 0 || aspect <= 0) {
    return src;
  }
  final srcAspect = src.width / src.height;
  late int cropW;
  late int cropH;
  if (srcAspect > aspect) {
    cropH = src.height;
    cropW = math.max(1, (cropH * aspect).round());
  } else {
    cropW = src.width;
    cropH = math.max(1, (cropW / aspect).round());
  }
  final x = math.max(0, ((src.width - cropW) / 2).floor());
  final y = math.max(0, ((src.height - cropH) / 2).floor());
  return img.copyCrop(src, x: x, y: y, width: cropW, height: cropH);
}

img.Image _fitMaxLongEdge(img.Image src, int maxEdge) {
  final long = math.max(src.width, src.height);
  if (long <= maxEdge) {
    return src;
  }
  if (src.width >= src.height) {
    return img.copyResize(
      src,
      width: maxEdge,
      interpolation: img.Interpolation.linear,
    );
  }
  return img.copyResize(
    src,
    height: maxEdge,
    interpolation: img.Interpolation.linear,
  );
}

/// Mild brightness/contrast + slight sharpen. No hue/saturation shifts.
img.Image _lightEnhance(img.Image src) {
  var out = img.adjustColor(
    src,
    brightness: 1.03,
    contrast: 1.08,
  );
  // Mild unsharp-style kernel (weaker than classic 0/-1/5).
  out = img.convolution(
    out,
    filter: const <num>[
      0,
      -0.4,
      0,
      -0.4,
      2.6,
      -0.4,
      0,
      -0.4,
      0,
    ],
  );
  return out;
}
