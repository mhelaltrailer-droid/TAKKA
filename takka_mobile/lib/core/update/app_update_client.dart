import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class RemoteAppVersion {
  const RemoteAppVersion({
    required this.latestVersion,
    required this.latestBuild,
    required this.minBuild,
    required this.downloadUrl,
    required this.releaseNotesAr,
  });

  final String latestVersion;
  final int latestBuild;
  final int minBuild;
  final String downloadUrl;
  final String releaseNotesAr;

  static RemoteAppVersion? tryParse(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is! Map) {
        return null;
      }
      if (decoded['configured'] != true) {
        return null;
      }
      final latestBuild = _asInt(decoded['latestBuild']);
      final minBuild = _asInt(decoded['minBuild']);
      final downloadUrl = decoded['downloadUrl'];
      if (latestBuild == null || latestBuild <= 0 || minBuild == null || minBuild < 0) {
        return null;
      }
      if (downloadUrl is! String || !_isHttpUrl(downloadUrl)) {
        return null;
      }
      final latestVersion = decoded['latestVersion'];
      final notes = decoded['releaseNotesAr'];
      return RemoteAppVersion(
        latestVersion: latestVersion is String ? latestVersion.trim() : '',
        latestBuild: latestBuild,
        minBuild: minBuild,
        downloadUrl: downloadUrl.trim(),
        releaseNotesAr: notes is String ? notes.trim() : '',
      );
    } catch (_) {
      return null;
    }
  }

  static int? _asInt(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is String) {
      return int.tryParse(value.trim());
    }
    return null;
  }

  static bool _isHttpUrl(String value) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null || !uri.hasAuthority) {
      return false;
    }
    return uri.scheme == 'https' || uri.scheme == 'http';
  }
}

class AppUpdateClient {
  const AppUpdateClient({this.httpClient});

  final http.Client? httpClient;

  Future<RemoteAppVersion?> fetch() async {
    final base = AppConfig.apiBaseUrl.trim();
    if (base.isEmpty) {
      return null;
    }
    final root = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final uri = Uri.tryParse('$root/api/mobile/app-version');
    if (uri == null || !uri.hasScheme) {
      return null;
    }

    final client = httpClient ?? http.Client();
    final ownsClient = httpClient == null;
    try {
      final response = await client.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('app version status ${response.statusCode}');
      }
      return RemoteAppVersion.tryParse(response.body);
    } finally {
      if (ownsClient) {
        client.close();
      }
    }
  }
}
