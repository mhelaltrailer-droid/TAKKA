import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

import '../config/app_config.dart';

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

  Future<String?> pickAndUploadImage({
    required String sessionToken,
    required String purpose,
  }) async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );

    if (file == null) {
      return null;
    }

    final request = http.MultipartRequest(
      'POST',
      _buildUri('/api/mobile/upload'),
    )
      ..headers['Authorization'] = 'Bearer $sessionToken'
      ..fields['purpose'] = purpose
      ..files.add(await http.MultipartFile.fromPath('file', file.path));

    final streamed = await request.send().timeout(const Duration(seconds: 90));
    final response = await http.Response.fromStream(streamed).timeout(
      const Duration(seconds: 30),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'فشل رفع الصورة.';
      try {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        message = body['error']?.toString() ?? message;
      } catch (_) {
        message = 'فشل رفع الصورة (${response.statusCode}).';
      }
      throw Exception(message);
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final url = json['url']?.toString();
    if (url == null || url.isEmpty) {
      throw Exception('اكتمل الرفع لكن لم يُرجع رابط الصورة.');
    }
    return url;
  }
}
