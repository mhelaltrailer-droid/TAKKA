import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import '../config/app_config.dart';
import '../images/image_display_settings.dart';
import '../images/image_pipeline.dart';
import '../images/image_upload_preview.dart';

/// App-facing error whose [toString] is the Arabic message (no "Exception:" prefix).
class UploadException implements Exception {
  UploadException(this.message);
  final String message;

  @override
  String toString() => message;
}

class MobileUploadService {
  MobileUploadService({
    ImagePicker? picker,
    ImageDisplaySettingsClient? settingsClient,
  })  : _picker = picker ?? ImagePicker(),
        _settingsClient = settingsClient ?? ImageDisplaySettingsClient();

  final ImagePicker _picker;
  final ImageDisplaySettingsClient _settingsClient;

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
  }

  /// Picks from gallery, compresses (max 1280 long edge, q~75), optionally
  /// crops + lightly enhances food photos, then presigns and PUTs to R2.
  ///
  /// Pass [context] for food purposes so the kitchen can toggle
  /// «الصورة الأصلية / المحسّنة» before upload.
  Future<String?> pickAndUploadImage({
    required String sessionToken,
    required String purpose,
    BuildContext? context,
  }) async {
    final XFile? file;
    try {
      file = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: kImageMaxLongEdge.toDouble(),
        maxHeight: kImageMaxLongEdge.toDouble(),
        imageQuality: kImageExportQuality,
      );
    } catch (_) {
      throw UploadException(
        'تعذر فتح معرض الصور. تأكد من السماح للتطبيق بالوصول للصور.',
      );
    }

    if (file == null) {
      return null;
    }

    final rawBytes = await _readFile(file);
    final settings = await _settingsClient.fetch();
    final shouldEnhance =
        settings.enhancementEnabled && isFoodEnhancePurpose(purpose);

    late final Uint8List uploadBytes;
    late final String mime;

    try {
      final processed = await processUploadImage(
        ImageProcessRequest(
          bytes: Uint8List.fromList(rawBytes),
          purpose: purpose,
          enhance: shouldEnhance,
        ),
      );
      mime = processed.contentType;

      if (shouldEnhance &&
          context != null &&
          context.mounted &&
          !_sameBytes(processed.originalBytes, processed.enhancedBytes)) {
        final chosen = await showImageUploadPreview(
          context: context,
          originalBytes: processed.originalBytes,
          enhancedBytes: processed.enhancedBytes,
        );
        if (chosen == null) {
          return null;
        }
        uploadBytes = chosen;
      } else {
        uploadBytes = shouldEnhance
            ? processed.enhancedBytes
            : processed.originalBytes;
      }
    } catch (_) {
      // Fall back to picker bytes if decode/process fails (e.g. exotic HEIC).
      uploadBytes = Uint8List.fromList(rawBytes);
      mime = _contentTypeFor(file).mimeType;
    }

    return _presignAndPut(
      sessionToken: sessionToken,
      purpose: purpose,
      bytes: uploadBytes,
      mime: mime,
      fileName: _jpegName(file.name),
    );
  }

  Future<String> _presignAndPut({
    required String sessionToken,
    required String purpose,
    required Uint8List bytes,
    required String mime,
    required String fileName,
  }) async {
    final http.Response presignResponse;
    try {
      presignResponse = await http
          .post(
            _buildUri('/api/mobile/uploads/presign'),
            headers: {
              'Authorization': 'Bearer $sessionToken',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'purpose': purpose,
              'contentType': mime,
              'fileName': fileName,
              'size': bytes.length,
            }),
          )
          .timeout(const Duration(seconds: 30));
    } catch (_) {
      throw UploadException(
        'تعذر الاتصال بالخادم أثناء رفع الصورة. تحقق من الإنترنت وحاول مجددًا.',
      );
    }

    if (presignResponse.statusCode < 200 || presignResponse.statusCode >= 300) {
      throw UploadException(_errorMessage(presignResponse));
    }

    final presign = jsonDecode(presignResponse.body);
    if (presign is! Map) {
      throw UploadException('تعذر تجهيز رفع الصورة.');
    }

    final uploadUrl = presign['uploadUrl']?.toString();
    final publicUrl = presign['url']?.toString();
    if (uploadUrl == null ||
        uploadUrl.isEmpty ||
        publicUrl == null ||
        publicUrl.isEmpty) {
      throw UploadException('اكتمل الرفع لكن لم يُرجع رابط الصورة.');
    }

    final putHeaders = <String, String>{};
    final rawHeaders = presign['headers'];
    if (rawHeaders is Map) {
      for (final entry in rawHeaders.entries) {
        putHeaders['${entry.key}'] = '${entry.value}';
      }
    }
    putHeaders.putIfAbsent('Content-Type', () => mime);

    final http.Response putResponse;
    try {
      putResponse = await http
          .put(
            Uri.parse(uploadUrl),
            headers: putHeaders,
            body: bytes,
          )
          .timeout(const Duration(seconds: 90));
    } catch (_) {
      throw UploadException(
        'تعذر الاتصال بالخادم أثناء رفع الصورة. تحقق من الإنترنت وحاول مجددًا.',
      );
    }

    if (putResponse.statusCode < 200 || putResponse.statusCode >= 300) {
      throw UploadException('فشل رفع الصورة (${putResponse.statusCode}).');
    }

    return publicUrl;
  }

  MediaType _contentTypeFor(XFile file) {
    final mime = (file.mimeType ?? '').trim().toLowerCase();
    if (mime.startsWith('image/') && mime.contains('/')) {
      final parts = mime.split('/');
      return MediaType(parts[0], parts[1]);
    }

    final name = file.name.toLowerCase();
    if (name.endsWith('.png')) return MediaType('image', 'png');
    if (name.endsWith('.webp')) return MediaType('image', 'webp');
    if (name.endsWith('.gif')) return MediaType('image', 'gif');
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      return MediaType('image', 'heic');
    }
    return MediaType('image', 'jpeg');
  }

  String _jpegName(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      return 'upload.jpg';
    }
    if (trimmed.toLowerCase().endsWith('.jpg') ||
        trimmed.toLowerCase().endsWith('.jpeg')) {
      return trimmed;
    }
    return '${trimmed.replaceAll(RegExp(r'\.[^.]+$'), '')}.jpg';
  }

  bool _sameBytes(Uint8List a, Uint8List b) {
    if (identical(a, b)) {
      return true;
    }
    if (a.length != b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
        return false;
      }
    }
    return true;
  }

  Future<List<int>> _readFile(XFile file) async {
    try {
      return await file.readAsBytes();
    } catch (_) {
      throw UploadException('تعذر قراءة الصورة المختارة.');
    }
  }

  String _errorMessage(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body['error'] != null) {
        return body['error'].toString();
      }
    } catch (_) {
      // Fall through to the status-based message.
    }

    if (response.statusCode == 401) {
      return 'يجب تسجيل الدخول أولًا ثم إعادة رفع الصورة.';
    }
    if (response.statusCode == 413) {
      return 'حجم الصورة كبير جدًا.';
    }
    return 'فشل رفع الصورة (${response.statusCode}).';
  }
}
