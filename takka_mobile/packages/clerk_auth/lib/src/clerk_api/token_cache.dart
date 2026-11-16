import 'dart:convert';
import 'dart:io';

import 'package:clerk_auth/clerk_auth.dart';
import 'package:http/http.dart' as http;

/// A store for authentication tokens and IDs from the
/// Clerk back end
///
/// Only intended for use by [Api]
///
class TokenCache {
  /// Create a [TokenCache] instance
  ///
  TokenCache({
    required this.persistor,
    required String publishableKey,
  }) : _cacheId = cacheIdFor(publishableKey);

  /// Stable persistor suffix for [publishableKey].
  ///
  /// [String.hashCode] is salted per process and changes every time the
  /// app is killed. Using it as the storage key made the client token
  /// unreadable on the next launch, so Clerk minted a new client and the
  /// user had to sign in (and often confirm email) again.
  static String cacheIdFor(String publishableKey) {
    final sanitized = publishableKey.replaceAll(_nonKeyChars, '');
    final tail = sanitized.length <= 32
        ? sanitized
        : sanitized.substring(sanitized.length - 32);
    return 'v2$tail';
  }

  static final RegExp _nonKeyChars = RegExp('[^A-Za-z0-9]');

  /// The [Persistor] used to store session and client data
  final Persistor persistor;

  final String _cacheId;
  final _sessionTokens = <String, SessionToken>{};

  String _sessionId = '';
  String _clientToken = '';
  String _clientId = '';

  /// Whether or not we have a [clientToken]
  bool get hasClientToken => _clientToken.isNotEmpty;

  /// Whether or not we have a [clientId]
  bool get hasClientId => _clientId.isNotEmpty;

  /// Whether or not the [sessionTokenFor] can be refreshed
  bool get canRefreshSessionToken => hasClientToken && sessionId.isNotEmpty;

  String get _sessionIdKey => '_clerkSession_Id_$_cacheId';

  String get _sessionTokenKey => '_clerkSession_Tokens_$_cacheId';

  String get _clientTokenKey => '_clerkClient_Token_$_cacheId';

  String get _clientIdKey => '_clerkClient_Id_$_cacheId';

  List<String> get _persistorKeys =>
      [_sessionIdKey, _sessionTokenKey, _clientTokenKey, _clientIdKey];

  /// Initialise the cache
  Future<void> initialize() async {
    await _migrateLegacyTokenKeys();

    // Read all stored variables first before assignment
    final sessionId = await persistor.read<String>(_sessionIdKey) ?? '';
    _sessionId = sessionId;

    final sessionTokens = await persistor.read<String>(_sessionTokenKey);
    if (sessionTokens case String sessionTokens) {
      final sessionTokenData =
          json.decode(sessionTokens) as Map<String, dynamic>;
      for (final entry in sessionTokenData.entries) {
        final sessionToken =
            SessionToken.fromJson(entry.value as Map<String, dynamic>);
        if (sessionToken.isNotExpired) {
          _sessionTokens[entry.key] = sessionToken;
        }
      }
    }

    final clientToken = await persistor.read<String>(_clientTokenKey) ?? '';
    _clientToken = clientToken;

    final clientId = await persistor.read<String>(_clientIdKey) ?? '';
    _clientId = clientId;
  }

  /// Older builds stored tokens under `publishableKey.hashCode`, which is
  /// not stable across process starts. Move the first legacy bundle onto
  /// [cacheIdFor] so an already-signed-in install keeps its session.
  Future<void> _migrateLegacyTokenKeys() async {
    if ((await persistor.read<String>(_clientTokenKey) ?? '').isNotEmpty) {
      return;
    }

    final stored = await persistor.keys();
    String? legacySuffix;
    for (final key in stored) {
      if (!key.startsWith('_clerkClient_Token_')) continue;
      final suffix = key.substring('_clerkClient_Token_'.length);
      if (suffix == _cacheId || suffix.isEmpty) continue;
      legacySuffix = suffix;
      break;
    }
    if (legacySuffix == null) return;

    const prefixes = <String>[
      '_clerkSession_Id_',
      '_clerkSession_Tokens_',
      '_clerkClient_Token_',
      '_clerkClient_Id_',
    ];
    for (final prefix in prefixes) {
      final oldKey = '$prefix$legacySuffix';
      final value = await persistor.read<Object>(oldKey);
      if (value == null) continue;
      await persistor.write<Object>('$prefix$_cacheId', value);
      await persistor.delete(oldKey);
    }
  }

  /// Dispose of [TokenCache]
  void terminate() {}

  /// Reset the [TokenCache]
  ///
  void clear() {
    _sessionId = '';
    _clientToken = '';
    _clientId = '';
    _sessionTokens.clear();
    for (final key in _persistorKeys) {
      persistor.delete(key);
    }
  }

  /// Get the [sessionId]
  String get sessionId => _sessionId;

  void _setSessionId(String id) {
    if (_sessionId == id) return;

    _sessionId = id;
    persistor.write(_sessionIdKey, id);
  }

  /// Get the [clientToken]
  String get clientToken => _clientToken;

  void _setClientToken(String token) {
    if (token == _clientToken) return;

    _clientToken = token;
    persistor.write(_clientTokenKey, token);
  }

  /// Get the [clientId]
  String get clientId => _clientId;

  void _setClientId(String id) {
    if (_clientId == id) return;

    _clientId = id;
    persistor.write(_clientIdKey, id);
  }

  /// Get the [sessionTokenFor] for a [orgId]
  SessionToken? sessionTokenFor(String? templateName, Organization? org) {
    org ??= Organization.personal;
    return switch (_sessionTokens[_sessionTokenId(org.id, templateName)]) {
      SessionToken token when token.isNotExpired => token,
      _ => null,
    };
  }

  String _sessionTokenId(String orgId, String? templateName) =>
      switch (templateName) {
        String templateName => '$orgId-$templateName',
        _ => orgId,
      };

  /// Set a [sessionToken] for an organization
  SessionToken makeAndCacheSessionToken(String token, [String? templateName]) {
    final sessionToken = SessionToken(jwt: token, templateName: templateName);
    final id = _sessionTokenId(sessionToken.orgId, templateName);
    if (token != _sessionTokens[id]?.jwt) {
      _sessionTokens[id] = sessionToken;
      persistor.write(_sessionTokenKey, json.encode(_sessionTokens));
    }

    return _sessionTokens[id]!;
  }

  /// Update the tokens and IDs from a newly arrived [http.Response]
  /// and [Session]
  ///
  void updateFrom(http.Response resp, Client client) {
    final newClientToken = resp.headers[HttpHeaders.authorizationHeader];
    if (newClientToken case String token) {
      _setClientToken(token);
    }

    if (client.id case String id) {
      _setClientId(id);
    }

    if (client.activeSession case Session session) {
      if (session.id case String id) {
        _setSessionId(id);
      }

      if (session.lastActiveToken?.jwt case String jwt) {
        makeAndCacheSessionToken(jwt);
      }
    }
  }
}
