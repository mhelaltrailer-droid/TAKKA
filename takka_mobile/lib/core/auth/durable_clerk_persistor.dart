import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:clerk_auth/clerk_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

/// Optional encrypted copy of the Clerk client token.
///
/// The JSON file under application support is the source of truth so a
/// process kill cannot drop a sign-in. The vault is a second copy that
/// survives if that file is removed while the app stays installed.
abstract class ClerkTokenVault {
  Future<String?> readBundle();

  Future<void> writeBundle(String json);

  Future<void> deleteBundle();
}

/// [ClerkTokenVault] backed by [FlutterSecureStorage].
class FlutterSecureClerkTokenVault implements ClerkTokenVault {
  const FlutterSecureClerkTokenVault();

  static const _key = 'takka_clerk_client_token';
  static const _storage = FlutterSecureStorage();

  @override
  Future<String?> readBundle() async {
    try {
      return await _storage.read(key: _key);
    } on Object {
      return null;
    }
  }

  @override
  Future<void> writeBundle(String json) async {
    try {
      await _storage.write(key: _key, value: json);
    } on Object {
      // The support-directory file is already written.
    }
  }

  @override
  Future<void> deleteBundle() async {
    try {
      await _storage.delete(key: _key);
    } on Object {
      // Ignore. The file copy is cleared by [delete].
    }
  }
}

/// Clerk [Persistor] that writes synchronously to application support.
///
/// [DefaultPersistor] waits 600ms and drops the write if the process dies
/// first. This implementation flushes on every [write] so a sign-in that
/// has returned is still on disk if the user immediately closes the app.
class DurableClerkPersistor implements Persistor {
  DurableClerkPersistor({required this._directory, this._vault});

  /// Application support (not cache), importing a legacy documents file.
  static Future<DurableClerkPersistor> open() async {
    final directory = await _durableDirectory();
    await _importLegacyDocumentsFile(directory);
    return DurableClerkPersistor(
      directory: directory,
      vault: const FlutterSecureClerkTokenVault(),
    );
  }

  final Directory _directory;
  final ClerkTokenVault? _vault;
  final Map<String, dynamic> _cache = {};

  var _initialized = false;
  Future<void> _vaultChain = Future<void>.value();

  File get _file =>
      File('${_directory.path}${Platform.pathSeparator}clerk_sdk.json');

  static Future<Directory> _durableDirectory() async {
    try {
      return await getApplicationSupportDirectory();
    } on Object {
      return getApplicationDocumentsDirectory();
    }
  }

  static Future<void> _importLegacyDocumentsFile(Directory supportDir) async {
    final target = File(
      '${supportDir.path}${Platform.pathSeparator}clerk_sdk.json',
    );
    if (target.existsSync()) return;
    try {
      final docs = await getApplicationDocumentsDirectory();
      final legacy = File(
        '${docs.path}${Platform.pathSeparator}clerk_sdk.json',
      );
      if (!legacy.existsSync()) return;
      if (!supportDir.existsSync()) {
        supportDir.createSync(recursive: true);
      }
      await legacy.copy(target.path);
    } on Object {
      // Fresh install, or documents is unavailable.
    }
  }

  @override
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    if (!_directory.existsSync()) {
      _directory.createSync(recursive: true);
    }
    try {
      if (_file.existsSync()) {
        final data = await _file.readAsString();
        final decoded = json.decode(data);
        if (decoded is Map<String, dynamic>) {
          _cache.addAll(decoded);
        } else if (decoded is Map) {
          _cache.addAll(Map<String, dynamic>.from(decoded));
        }
      }
    } on FormatException {
      if (_file.existsSync()) {
        _file.deleteSync();
      }
    } on Object {
      // Unreadable file: start empty and let the vault fill token keys.
    }
    await _mergeVault();
  }

  @override
  void terminate() {
    _writeFileSync();
    _enqueueVault();
  }

  /// Rewrite the file and wait for the secure-storage copy.
  Future<void> flush() async {
    _writeFileSync();
    _enqueueVault();
    try {
      await _vaultChain;
    } on Object {
      // File flush already succeeded.
    }
  }

  @override
  FutureOr<T?> read<T>(String key) => _cache[key] as T?;

  @override
  Future<void> write<T>(String key, T value) async {
    _cache[key] = value;
    _writeFileSync();
    if (_isVaultKey(key)) {
      _enqueueVault();
    }
  }

  @override
  Future<void> delete(String key) async {
    final removed = _cache.remove(key) != null;
    if (removed) {
      _writeFileSync();
    }
    if (_isVaultKey(key)) {
      _enqueueVault();
    }
  }

  @override
  FutureOr<Iterable<String>> keys() => _cache.keys.toList(growable: false);

  bool _isVaultKey(String key) {
    return key.startsWith('_clerkClient_Token_') ||
        key.startsWith('_clerkClient_Id_') ||
        key.startsWith('_clerkSession_Id_');
  }

  Map<String, dynamic> _vaultSnapshot() {
    return Map<String, dynamic>.fromEntries(
      _cache.entries.where((entry) => _isVaultKey(entry.key)),
    );
  }

  Future<void> _mergeVault() async {
    final vault = _vault;
    if (vault == null) return;
    try {
      final raw = await vault.readBundle();
      if (raw == null || raw.isEmpty) return;
      final decoded = json.decode(raw);
      if (decoded is! Map) return;
      var changed = false;
      decoded.forEach((key, value) {
        if (key is! String || !_isVaultKey(key)) return;
        if (_cache.containsKey(key)) return;
        _cache[key] = value;
        changed = true;
      });
      if (changed) {
        _writeFileSync();
      }
    } on Object {
      // Secure storage is optional.
    }
  }

  void _enqueueVault() {
    final vault = _vault;
    if (vault == null) return;
    _vaultChain = _vaultChain
        .then((_) async {
          final snapshot = _vaultSnapshot();
          if (snapshot.isEmpty) {
            await vault.deleteBundle();
            return;
          }
          await vault.writeBundle(json.encode(snapshot));
        })
        .catchError((Object _) {});
  }

  void _writeFileSync() {
    if (!_directory.existsSync()) {
      _directory.createSync(recursive: true);
    }
    _file.writeAsStringSync(json.encode(_cache));
  }
}
