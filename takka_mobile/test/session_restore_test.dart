import 'dart:io';

import 'package:clerk_auth/src/clerk_api/token_cache.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:takka_mobile/core/auth/durable_clerk_persistor.dart';
import 'package:takka_mobile/features/auth/data/app_role.dart';
import 'package:takka_mobile/features/auth/data/app_role_cache.dart';
import 'package:takka_mobile/features/auth/data/restored_home.dart';

class _MemoryRoleStore implements AppRoleStore {
  final Map<String, String> values = {};

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }
}

class _MemoryVault implements ClerkTokenVault {
  String? bundle;

  @override
  Future<void> deleteBundle() async {
    bundle = null;
  }

  @override
  Future<String?> readBundle() async => bundle;

  @override
  Future<void> writeBundle(String json) async {
    bundle = json;
  }
}

void main() {
  group('resolveRestoredHome', () {
    test('cached kitchen role routes before the server answers', () {
      expect(
        resolveRestoredHome(
          sessionOverride: null,
          serverRole: null,
          serverSettled: false,
          serverFailed: false,
          cachedRole: AppRole.kitchenOwner,
          metadataRole: null,
          cacheLoaded: true,
        ),
        RestoredHome.kitchen,
      );
    });

    test('cached customer role wins over a missing server response', () {
      expect(
        resolveRestoredHome(
          sessionOverride: null,
          serverRole: null,
          serverSettled: true,
          serverFailed: true,
          cachedRole: AppRole.customer,
          metadataRole: AppRole.kitchenOwner,
          cacheLoaded: true,
        ),
        RestoredHome.customer,
      );
    });

    test('a settled server role re-routes away from the cache', () {
      expect(
        resolveRestoredHome(
          sessionOverride: null,
          serverRole: AppRole.kitchenOwner,
          serverSettled: true,
          serverFailed: false,
          cachedRole: AppRole.customer,
          metadataRole: AppRole.customer,
          cacheLoaded: true,
        ),
        RestoredHome.kitchen,
      );
    });

    test('no known role stays on the splash until the server answers', () {
      expect(
        resolveRestoredHome(
          sessionOverride: null,
          serverRole: null,
          serverSettled: false,
          serverFailed: false,
          cachedRole: null,
          metadataRole: null,
          cacheLoaded: true,
        ),
        RestoredHome.splash,
      );
    });

    test('server failure with no cache asks to retry and stays signed in', () {
      expect(
        resolveRestoredHome(
          sessionOverride: null,
          serverRole: null,
          serverSettled: true,
          serverFailed: true,
          cachedRole: null,
          metadataRole: null,
          cacheLoaded: true,
        ),
        RestoredHome.retry,
      );
    });

    test('server confirming an empty role shows role setup', () {
      expect(
        resolveRestoredHome(
          sessionOverride: null,
          serverRole: null,
          serverSettled: true,
          serverFailed: false,
          cachedRole: AppRole.customer,
          metadataRole: AppRole.customer,
          cacheLoaded: true,
        ),
        RestoredHome.roleSetup,
      );
    });

    test('a role saved in this session wins over the server', () {
      expect(
        resolveRestoredHome(
          sessionOverride: AppRole.kitchenOwner,
          serverRole: AppRole.customer,
          serverSettled: true,
          serverFailed: false,
          cachedRole: AppRole.customer,
          metadataRole: AppRole.customer,
          cacheLoaded: true,
        ),
        RestoredHome.kitchen,
      );
    });
  });

  group('AppRoleCache', () {
    test(
      'round-trips a role for the same user and ignores another user',
      () async {
        final cache = AppRoleCache(store: _MemoryRoleStore());
        await cache.write(userId: 'user_a', role: AppRole.kitchenOwner);

        expect(await cache.read(userId: 'user_a'), AppRole.kitchenOwner);
        expect(await cache.read(userId: 'user_b'), isNull);

        await cache.clear();
        expect(await cache.read(userId: 'user_a'), isNull);
      },
    );
  });

  group('DurableClerkPersistor', () {
    late Directory directory;

    setUp(() async {
      directory = await Directory.systemTemp.createTemp('takka_clerk_');
    });

    tearDown(() async {
      if (directory.existsSync()) {
        await directory.delete(recursive: true);
      }
    });

    test(
      'a write is readable immediately, including after a new instance',
      () async {
        final vault = _MemoryVault();
        final first = DurableClerkPersistor(directory: directory, vault: vault);
        await first.initialize();
        const tokenKey = '_clerkClient_Token_v2test';
        await first.write(tokenKey, 'client_token');
        await first.write(r'$client', <String, dynamic>{'id': 'client_1'});
        await first.flush();

        expect(await first.read<String>(tokenKey), 'client_token');
        expect(vault.bundle, contains('client_token'));

        final second = DurableClerkPersistor(
          directory: directory,
          vault: vault,
        );
        await second.initialize();
        expect(await second.read<String>(tokenKey), 'client_token');
        final client = await second.read<Map<dynamic, dynamic>>(r'$client');
        expect(client?['id'], 'client_1');
        expect(
          TokenCache.cacheIdFor('pk_test_example').startsWith('v2'),
          isTrue,
        );
      },
    );

    test(
      'secure storage restores a client token when the file was removed',
      () async {
        final vault = _MemoryVault();
        final first = DurableClerkPersistor(directory: directory, vault: vault);
        await first.initialize();
        const tokenKey = '_clerkClient_Token_v2test';
        await first.write(tokenKey, 'client_token');
        await first.flush();

        final file = File(
          '${directory.path}${Platform.pathSeparator}clerk_sdk.json',
        );
        file.deleteSync();

        final second = DurableClerkPersistor(
          directory: directory,
          vault: vault,
        );
        await second.initialize();
        expect(await second.read<String>(tokenKey), 'client_token');
      },
    );
  });
}
