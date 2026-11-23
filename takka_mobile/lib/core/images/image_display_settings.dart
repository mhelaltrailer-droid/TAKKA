import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

enum WatermarkPosition {
  bottomLeft,
  bottomRight,
  topLeft,
  topRight,
}

class ImageDisplaySettings {
  const ImageDisplaySettings({
    required this.watermarkEnabled,
    required this.enhancementEnabled,
    required this.watermarkPosition,
  });

  final bool watermarkEnabled;
  final bool enhancementEnabled;
  final WatermarkPosition watermarkPosition;

  static const defaults = ImageDisplaySettings(
    watermarkEnabled: true,
    enhancementEnabled: true,
    watermarkPosition: WatermarkPosition.bottomLeft,
  );

  static ImageDisplaySettings fromJson(Map<dynamic, dynamic> json) {
    return ImageDisplaySettings(
      watermarkEnabled: json['watermarkEnabled'] != false,
      enhancementEnabled: json['enhancementEnabled'] != false,
      watermarkPosition: _parsePosition(json['watermarkPosition']),
    );
  }

  static WatermarkPosition _parsePosition(Object? raw) {
    switch (raw?.toString()) {
      case 'bottomRight':
        return WatermarkPosition.bottomRight;
      case 'topLeft':
        return WatermarkPosition.topLeft;
      case 'topRight':
        return WatermarkPosition.topRight;
      case 'bottomLeft':
      default:
        return WatermarkPosition.bottomLeft;
    }
  }
}

class ImageDisplaySettingsClient {
  ImageDisplaySettingsClient({http.Client? httpClient})
      : _httpClient = httpClient;

  final http.Client? _httpClient;

  static ImageDisplaySettings? _cached;
  static DateTime? _cachedAt;
  static const _cacheTtl = Duration(seconds: 45);

  Future<ImageDisplaySettings> fetch({bool force = false}) async {
    final now = DateTime.now();
    if (!force &&
        _cached != null &&
        _cachedAt != null &&
        now.difference(_cachedAt!) < _cacheTtl) {
      return _cached!;
    }

    final base = AppConfig.apiBaseUrl.trim();
    if (base.isEmpty) {
      return ImageDisplaySettings.defaults;
    }
    final root = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final uri = Uri.tryParse('$root/api/discovery/image-settings');
    if (uri == null) {
      return ImageDisplaySettings.defaults;
    }

    final client = _httpClient ?? http.Client();
    final ownsClient = _httpClient == null;
    try {
      final response =
          await client.get(uri).timeout(const Duration(seconds: 6));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return ImageDisplaySettings.defaults;
      }
      final decoded = jsonDecode(response.body);
      if (decoded is! Map) {
        return ImageDisplaySettings.defaults;
      }
      final value = ImageDisplaySettings.fromJson(decoded);
      _cached = value;
      _cachedAt = now;
      return value;
    } catch (_) {
      return _cached ?? ImageDisplaySettings.defaults;
    } finally {
      if (ownsClient) {
        client.close();
      }
    }
  }
}
