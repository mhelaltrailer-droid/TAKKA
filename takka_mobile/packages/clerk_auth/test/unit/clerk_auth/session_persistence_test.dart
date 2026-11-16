import 'dart:async';
import 'dart:io';

import 'package:clerk_auth/clerk_auth.dart';
import 'package:clerk_auth/src/clerk_api/api.dart';
import 'package:clerk_auth/src/clerk_api/token_cache.dart';

import '../../test_helpers.dart';

/// In-memory [Persistor] that actually keeps values across [Auth] instances.
class MemoryPersistor implements Persistor {
  final Map<String, dynamic> storage = {};

  @override
  Future<void> initialize() async {}

  @override
  void terminate() {}

  @override
  FutureOr<T?> read<T>(String key) => storage[key] as T?;

  @override
  FutureOr<void> write<T>(String key, T value) {
    storage[key] = value;
  }

  @override
  FutureOr<void> delete(String key) {
    storage.remove(key);
  }

  @override
  FutureOr<Iterable<String>> keys() => storage.keys.toList(growable: false);
}

AuthConfig _config({
  required Persistor persistor,
  required HttpService httpService,
}) {
  return AuthConfig(
    publishableKey: TestAuthConfig.kPublishableKey,
    persistor: persistor,
    httpService: httpService,
    sessionTokenPolling: false,
    clientRefreshPeriod: Duration.zero,
    telemetryPeriod: Duration.zero,
    retryOptions: const RetryOptions(maxAttempts: 1),
  );
}

void main() {
  group('session persistence', () {
    late MemoryPersistor persistor;
    late MockHttpService mockHttp;

    setUp(() {
      persistor = MemoryPersistor();
      mockHttp = MockHttpService();
    });

    Future<Auth> signIn() async {
      mockHttp.addAuthenticatedClientWithSessionResponse();
      mockHttp.addEnvironmentResponse();
      final auth = Auth(
        config: _config(persistor: persistor, httpService: mockHttp),
      );
      await auth.initialize();
      return auth;
    }

    test('restores a signed-in client when the next launch is offline', () async {
      final first = await signIn();
      expect(first.isSignedIn, true);
      first.terminate();

      mockHttp.reset();
      mockHttp.isOffline = true;
      final second = Auth(
        config: _config(persistor: persistor, httpService: mockHttp),
      );
      await second.initialize();

      expect(second.isSignedIn, true);
      expect(second.user?.id, 'user_123');
      second.terminate();
    });

    test('a failed client refresh does not POST a new client or sign out', () async {
      final first = await signIn();
      expect(first.isSignedIn, true);
      first.terminate();

      mockHttp.reset();
      mockHttp.addJsonResponse({'errors': []}, statusCode: 500);
      mockHttp.addJsonResponse({'errors': []}, statusCode: 500);
      final second = Auth(
        config: _config(persistor: persistor, httpService: mockHttp),
      );
      await second.initialize();

      expect(second.isSignedIn, true);
      expect(
        mockHttp.calls.where((call) => call.method == HttpMethod.post),
        isEmpty,
      );
      second.terminate();
    });

    test('HTTP 401 on launch drops the persisted session', () async {
      final first = await signIn();
      first.terminate();

      mockHttp.reset();
      mockHttp.addJsonResponse({'errors': []}, statusCode: 401);
      final second = Auth(
        config: _config(persistor: persistor, httpService: mockHttp),
      );
      await second.initialize();

      expect(second.isSignedIn, false);
      expect(persistor.storage.containsKey(r'$client'), false);
      expect(
        mockHttp.calls.where((call) => call.method == HttpMethod.post),
        isEmpty,
      );
      second.terminate();
    });

    test('refreshClient keeps the session when Clerk is unreachable', () async {
      final auth = await signIn();
      mockHttp.isOffline = true;

      await auth.refreshClient();

      expect(auth.isSignedIn, true);
      auth.terminate();
    });

    test('refreshClient signs out when the client token is rejected', () async {
      final auth = await signIn();
      mockHttp.addJsonResponse({'errors': []}, statusCode: 401);

      await auth.refreshClient();

      expect(auth.isSignedIn, false);
      auth.terminate();
    });

    test('createClient does not mint a client when the stored token cannot refresh', () async {
      final cacheId = TokenCache.cacheIdFor(TestAuthConfig.kPublishableKey);
      await persistor.write('_clerkClient_Token_$cacheId', 'stored_token');
      final api = Api(
        config: _config(persistor: persistor, httpService: mockHttp),
      );
      await api.initialize();
      mockHttp.addJsonResponse({'errors': []}, statusCode: 503);

      final client = await api.createClient();

      expect(client.isEmpty, true);
      expect(mockHttp.calls.single.method, HttpMethod.get);
      expect(
        mockHttp.calls.single.headers?[HttpHeaders.authorizationHeader],
        'stored_token',
      );
    });

    test('createClient rethrows when the stored token is unauthorized', () async {
      final cacheId = TokenCache.cacheIdFor(TestAuthConfig.kPublishableKey);
      await persistor.write('_clerkClient_Token_$cacheId', 'stored_token');
      final api = Api(
        config: _config(persistor: persistor, httpService: mockHttp),
      );
      await api.initialize();
      mockHttp.addJsonResponse({'errors': []}, statusCode: 401);

      await expectLater(
        api.createClient(),
        throwsA(isA<ClerkSessionRejected>()),
      );
      expect(
        mockHttp.calls.where((call) => call.method == HttpMethod.post),
        isEmpty,
      );
    });
  });
}
