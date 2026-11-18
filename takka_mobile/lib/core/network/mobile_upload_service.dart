import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

import '../config/app_config.dart';

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
  }) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.endsWith('/')
        ? AppConfig.apiBaseUrl.substring(0, AppConfig.apiBaseUrl.length - 1)
        : AppConfig.apiBaseUrl;

    return Uri.parse('$base$path');
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

  Future<String?> pickAndUploadImage({
    required String sessionToken,
    required String purpose,
  }) async {
    final XFile? file;
    try {
      file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
    } catch (_) {
      throw UploadException(
        'تعذر فتح معرض الصور. تأكد من السماح للتطبيق بالوصول للصور.',
      );
    }

    if (file == null) {
      return null;
    }

    final bytes = await _readFile(file);
    final contentType = _contentTypeFor(file);
    final mime = '${contentType.type}/${contentType.subtype}';

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
              'fileName': file.name.isNotEmpty ? file.name : 'upload.jpg',
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
