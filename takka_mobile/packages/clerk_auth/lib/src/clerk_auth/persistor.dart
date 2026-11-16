import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:meta/meta.dart';

/// Abstract class defining the persistence interface for values
/// required to allow seamless auth across app runs
///
abstract class Persistor {
  /// A no-op persistor used for testing (persistor is now required to use the sdk)
  @visibleForTesting
  static const none = _NonePersistor();

  /// Initialise the service
  Future<void> initialize();

  /// Terminate the service
  void terminate();

  /// Read a [String?] from a [key]
  FutureOr<T?> read<T>(String key);

  /// Persist a [value] against a [key]
  FutureOr<void> write<T>(String key, T value);

  /// Delete data associated with a [key]
  FutureOr<void> delete(String key);

  /// Keys currently stored.
  ///
  /// The default is empty so existing [Persistor]s that cannot list keys
  /// stay valid. [DefaultPersistor] overrides this so legacy token keys
  /// written with an unstable [String.hashCode] can be migrated.
  FutureOr<Iterable<String>> keys() => const [];
}

final class _NonePersistor implements Persistor {
  const _NonePersistor();

  @override
  Future<void> initialize() async {}

  @override
  void terminate() {}

  @override
  FutureOr<T?> read<T>(String key) => null;

  @override
  FutureOr<void> write<T>(String key, T value) {}

  @override
  FutureOr<void> delete(String key) {}

  @override
  FutureOr<Iterable<String>> keys() => const [];
}

/// A function which returns a directory for file operations
typedef DirectoryGetter = FutureOr<Directory> Function();

/// A default [Persistor] that just writes a cache
/// of values to the file system
///
class DefaultPersistor implements Persistor {
  /// Constructor
  DefaultPersistor({required DirectoryGetter getCacheDirectory})
      : _getCacheDirectory = getCacheDirectory;

  /// A function to return the storage directory
  final DirectoryGetter _getCacheDirectory;

  static const _writeDelay = Duration(milliseconds: 600);
  static const _filename = 'clerk_sdk.json';

  /// The cache directory
  Directory? cacheDirectory;

  final _cache = <String, dynamic>{};
  late final File _cacheFile;
  Timer? _timer;

  @override
  Future<void> initialize() async {
    if (cacheDirectory == null) {
      cacheDirectory = await _getCacheDirectory();
      _cacheFile =
          File('${cacheDirectory!.path}${Platform.pathSeparator}$_filename');
      try {
        if (_cacheFile.existsSync()) {
          final data = await _cacheFile.readAsString();
          _cache.addAll(json.decode(data) as Map<String, dynamic>);
        }
      } on FormatException catch (_) {
        // if we can't decode the json file then we'll delete it and start over
        _cacheFile.deleteSync();
      }
    }
  }

  @override
  FutureOr<T?> read<T>(String key) => _cache[key] as T?;

  @override
  FutureOr<void> write<T>(String key, T value) {
    _cache[key] = value;
    _save();
  }

  @override
  FutureOr<void> delete(String key) {
    if (_cache.containsKey(key)) {
      _cache.remove(key);
      _save();
    }
  }

  @override
  FutureOr<Iterable<String>> keys() => _cache.keys.toList(growable: false);

  /// Write any debounced cache to disk immediately.
  ///
  /// [write] waits [_writeDelay] before touching the file. A process kill
  /// inside that window drops the session, and [terminate] used to cancel
  /// the timer without flushing. Call this on shutdown and when the app
  /// backgrounds.
  void flush() {
    _timer?.cancel();
    _timer = null;
    _writeCacheFileSync();
  }

  @override
  void terminate() {
    flush();
  }

  void _save() {
    _timer?.cancel();
    _timer = Timer(_writeDelay, _writeCacheFileSync);
  }

  void _writeCacheFileSync() {
    if (cacheDirectory == null) {
      return;
    }
    final data = json.encode(_cache);
    _cacheFile.writeAsStringSync(data);
  }
}
