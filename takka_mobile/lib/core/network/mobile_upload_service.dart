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

    final request = http.MultipartRequest(
      'POST',
      _buildUri('/api/mobile/upload'),
    )
      ..headers['Authorization'] = 'Bearer $sessionToken'
      ..fields['purpose'] = purpose
      ..files.add(
        await http.MultipartFile.fromPath(
          'file',
          file.path,
          filename: file.name.isNotEmpty ? file.name : 'upload.jpg',
          contentType: _contentTypeFor(file),
        ),
      );

    final http.Response response;
    try {
      final streamed =
          await request.send().timeout(const Duration(seconds: 90));
      response = await http.Response.fromStream(streamed).timeout(
        const Duration(seconds: 30),
      );
    } catch (_) {
      throw UploadException(
        'تعذر الاتصال بالخادم أثناء رفع الصورة. تحقق من الإنترنت وحاول مجددًا.',
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'فشل رفع الصورة.';
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        message = body['error']?.toString() ?? message;
      } catch (_) {
        if (response.statusCode == 401) {
          message = 'يجب تسجيل الدخول أولًا ثم إعادة رفع الصورة.';
        } else if (response.statusCode == 413) {
          message = 'حجم الصورة كبير جدًا.';
        } else {
          message = 'فشل رفع الصورة (${response.statusCode}).';
        }
      }
      throw UploadException(message);
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final url = json['url']?.toString();
    if (url == null || url.isEmpty) {
      throw UploadException('اكتمل الرفع لكن لم يُرجع رابط الصورة.');
    }
    return url;
  }
}
