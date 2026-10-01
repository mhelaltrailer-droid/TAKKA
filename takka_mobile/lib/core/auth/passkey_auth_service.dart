import 'dart:convert';
import 'dart:io';

import 'package:clerk_auth/clerk_auth.dart' as clerk;
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:passkeys/authenticator.dart';
import 'package:passkeys/types.dart';

import '../config/app_config.dart';
import 'passkey_prefs.dart';

/// Enroll and sign-in with Clerk passkeys (device biometrics / screen lock).
class PasskeyAuthService {
  const PasskeyAuthService();

  final PasskeyPrefs _prefs = const PasskeyPrefs();

  Future<bool> isDeviceSupported() async {
    try {
      final authenticator = PasskeyAuthenticator();
      if (Platform.isIOS) {
        return (await authenticator.getAvailability().iOS()).hasPasskeySupport;
      }
      if (Platform.isAndroid) {
        return (await authenticator.getAvailability().android())
            .hasPasskeySupport;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> shouldShowSignInButton(ClerkAuthState authState) async {
    if (!authState.env.supportsPasskeys) return false;
    if (!await isDeviceSupported()) return false;
    return _prefs.isEnabled();
  }

  Future<bool> shouldOfferEnroll(ClerkAuthState authState) async {
    if (!authState.env.supportsPasskeys) return false;
    if (!await isDeviceSupported()) return false;
    if (await _prefs.isEnabled()) return false;
    if (await _prefs.isPromptDismissed()) return false;
    return true;
  }

  /// Creates a Clerk passkey and registers it with the OS authenticator.
  Future<void> enroll(ClerkAuthState authState) async {
    final publishableKey = _publishableKey(authState);
    final fapiDomain = _clerkFrontendDomain(publishableKey);
    final created = await _createPasskeyForEnroll(authState, fapiDomain);
    final registerRequest = _buildRegisterRequest(
      created: created,
      fapiDomain: fapiDomain,
    );

    final authenticator = PasskeyAuthenticator(debugMode: true);
    late final RegisterResponseType res;
    try {
      res = await authenticator.register(registerRequest);
    } catch (error) {
      throw PasskeyEnrollException(
        _registerFailureMessage(
          error,
          rpId: registerRequest.relyingParty.id,
          fapiDomain: fapiDomain,
        ),
        cause: error,
      );
    }

    try {
      if (created.sdkPasskey != null) {
        await authState.attemptPasskeyVerification(
          created.sdkPasskey!,
          res.toJsonString(),
        );
      } else {
        await _attemptVerificationViaFapi(
          authState,
          passkeyId: created.passkeyId,
          credentialJson: res.toJsonString(),
        );
      }
    } catch (error) {
      throw PasskeyEnrollException(
        'اتسجّلت البصمة على الجهاز لكن تأكيد Clerk فشل. جرّب مرة أخرى.\n'
        '${_shortCause(error)}',
        cause: error,
      );
    }

    await _prefs.setEnabled(true);
    await _prefs.setPromptDismissed(true);
  }

  RegisterRequestType _buildRegisterRequest({
    required _CreatedPasskey created,
    required String fapiDomain,
  }) {
    // Prefer Clerk's raw WebAuthn options (includes pubKeyCredParams).
    if (created.rawOptions != null) {
      final options = _normalizeCreationOptions(
        created.rawOptions!,
        fapiDomain: fapiDomain,
      );
      try {
        return RegisterRequestType.fromJson(options);
      } catch (error) {
        debugPrint('RegisterRequestType.fromJson failed: $error');
      }
    }

    final nonce = created.nonce;
    final user = nonce.user!;
    final rpName = nonce.relyingParty.name?.trim().isNotEmpty == true
        ? nonce.relyingParty.name!
        : fapiDomain;
    final userName = user.name.trim().isNotEmpty
        ? user.name
        : (user.displayName.trim().isNotEmpty ? user.displayName : user.id);
    final displayName =
        user.displayName.trim().isNotEmpty ? user.displayName : userName;

    return RegisterRequestType(
      challenge: nonce.challenge,
      relyingParty: RelyingPartyType(
        name: rpName,
        // Android validates assetlinks against this exact host.
        id: fapiDomain,
      ),
      user: UserType(
        displayName: displayName,
        name: userName,
        id: user.id,
      ),
      excludeCredentials: const [],
      timeout: nonce.timeout <= 0 ? 60000 : nonce.timeout,
      pubKeyCredParams: [
        PubKeyCredParamType(type: 'public-key', alg: -7),
        PubKeyCredParamType(type: 'public-key', alg: -257),
      ],
      authSelectionType: AuthenticatorSelectionType(
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        residentKey: 'preferred',
        userVerification: nonce.userVerification?.trim().isNotEmpty == true
            ? nonce.userVerification!
            : 'preferred',
      ),
    );
  }

  Map<String, dynamic> _normalizeCreationOptions(
    Map<String, dynamic> raw, {
    required String fapiDomain,
  }) {
    final nested = raw['publicKey'];
    final Map<String, dynamic> options;
    if (nested is Map<String, dynamic>) {
      options = <String, dynamic>{...raw, ...nested};
    } else {
      options = Map<String, dynamic>.from(raw);
    }

    final rp = options['rp'];
    if (rp is Map) {
      options['rp'] = <String, dynamic>{
        ...Map<String, dynamic>.from(rp),
        'id': fapiDomain,
        if ((rp['name']?.toString().trim().isEmpty ?? true)) 'name': fapiDomain,
      };
    } else {
      options['rp'] = <String, dynamic>{
        'id': fapiDomain,
        'name': fapiDomain,
      };
    }

    final user = options['user'];
    if (user is Map) {
      final userMap = Map<String, dynamic>.from(user);
      final displayName = userMap['displayName'] ?? userMap['display_name'];
      if (displayName != null) {
        userMap['displayName'] = displayName.toString();
      }
      options['user'] = userMap;
    }

    options['pubKeyCredParams'] ??= [
      {'type': 'public-key', 'alg': -7},
      {'type': 'public-key', 'alg': -257},
    ];

    return options;
  }

  Future<_CreatedPasskey> _createPasskeyForEnroll(
    ClerkAuthState authState,
    String fapiDomain,
  ) async {
    // Prefer direct FAPI so we keep the full WebAuthn options JSON.
    final viaFapi = await _createPasskeyViaFapi(authState);
    if (viaFapi != null) return viaFapi;

    try {
      final created = await authState.createPasskey();
      final nonce = created?.verification?.nonce;
      if (created != null &&
          nonce != null &&
          nonce.challenge.isNotEmpty &&
          nonce.relyingParty.id.isNotEmpty &&
          nonce.user != null &&
          nonce.user!.id.isNotEmpty) {
        return _CreatedPasskey(
          passkeyId: created.id,
          nonce: nonce,
          sdkPasskey: created,
          rawOptions: nonce.toJson(),
        );
      }
    } on clerk.ClerkError catch (error) {
      throw PasskeyEnrollException(
        'تعذر إنشاء مفتاح البصمة من Clerk:\n${_clerkErrorText(error)}',
        cause: error,
      );
    } catch (error) {
      throw PasskeyEnrollException(
        'تعذر إنشاء مفتاح البصمة من Clerk.\n${_shortCause(error)}',
        cause: error,
      );
    }

    throw PasskeyEnrollException(
      'تعذر بدء إنشاء مفتاح الدخول السريع.\n'
      'نطاق البصمة المتوقع: $fapiDomain',
    );
  }

  Future<_CreatedPasskey?> _createPasskeyViaFapi(
    ClerkAuthState authState,
  ) async {
    try {
      final body = await _postClerkMe(
        authState,
        path: '/me/passkeys',
      );
      final passkeyJson = _extractPasskeyJson(body);
      if (passkeyJson == null) return null;

      final id = passkeyJson['id']?.toString();
      if (id == null || id.isEmpty) return null;

      final verification = passkeyJson['verification'];
      if (verification is! Map) return null;
      final nonceRaw = verification['nonce'];
      final Map<String, dynamic>? nonceMap;
      if (nonceRaw is String) {
        final decoded = jsonDecode(nonceRaw);
        nonceMap = decoded is Map<String, dynamic> ? decoded : null;
      } else if (nonceRaw is Map<String, dynamic>) {
        nonceMap = nonceRaw;
      } else {
        nonceMap = null;
      }
      if (nonceMap == null) return null;

      final nonce = clerk.VerificationNonce.fromJson(nonceMap);
      if (nonce.challenge.isEmpty ||
          nonce.relyingParty.id.isEmpty ||
          nonce.user == null ||
          nonce.user!.id.isEmpty) {
        return null;
      }

      return _CreatedPasskey(
        passkeyId: id,
        nonce: nonce,
        rawOptions: nonceMap,
      );
    } catch (error, stack) {
      debugPrint('FAPI createPasskey failed: $error\n$stack');
      return null;
    }
  }

  Future<void> _attemptVerificationViaFapi(
    ClerkAuthState authState, {
    required String passkeyId,
    required String credentialJson,
  }) async {
    final body = await _postClerkMe(
      authState,
      path: '/me/passkeys/$passkeyId/attempt_verification',
      fields: {
        'public_key_credential': credentialJson,
        'strategy': 'passkey',
      },
    );
    final errors = body['errors'];
    if (errors is List && errors.isNotEmpty) {
      throw PasskeyEnrollException(
        'Clerk رفض تأكيد البصمة.\n${errors.first}',
      );
    }
    try {
      await authState.refreshClient();
    } catch (_) {
      // Enrollment already verified server-side.
    }
  }

  Future<Map<String, dynamic>> _postClerkMe(
    ClerkAuthState authState, {
    required String path,
    Map<String, String>? fields,
  }) async {
    final publishableKey = _publishableKey(authState);
    final domain = _clerkFrontendDomain(publishableKey);
    final cacheId = publishableKey.hashCode;
    final persistor = authState.config.persistor;
    final clientToken =
        await persistor.read<String>('_clerkClient_Token_$cacheId');
    final sessionId =
        await persistor.read<String>('_clerkSession_Id_$cacheId');

    if (clientToken == null || clientToken.isEmpty) {
      throw const PasskeyEnrollException(
        'جلسة Clerk غير جاهزة لإنشاء البصمة. أعد تسجيل الدخول.',
      );
    }

    final uri = Uri(
      scheme: 'https',
      host: domain,
      path: '/v1$path',
      queryParameters: {
        '_is_native': 'true',
        '_clerk_js_version': '4.70.0',
        if (sessionId != null && sessionId.isNotEmpty)
          '_clerk_session_id': sessionId,
      },
    );

    final response = await http.post(
      uri,
      headers: {
        HttpHeaders.acceptHeader: 'application/json',
        HttpHeaders.authorizationHeader: clientToken,
        HttpHeaders.contentTypeHeader: 'application/x-www-form-urlencoded',
        'Clerk-API-Version': '2025-11-10',
        'x-mobile': '1',
      },
      body: fields,
    );

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw PasskeyEnrollException(
        'رد غير متوقع من Clerk (${response.statusCode}).',
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errors = decoded['errors'];
      final detail = errors is List && errors.isNotEmpty
          ? errors
              .map((e) => e is Map ? (e['long_message'] ?? e['message']) : e)
              .join('; ')
          : 'HTTP ${response.statusCode}';
      throw PasskeyEnrollException('Clerk: $detail');
    }
    return decoded;
  }

  static Map<String, dynamic>? _extractPasskeyJson(Map<String, dynamic> body) {
    final response = body['response'];
    if (response is Map<String, dynamic> && response['id'] != null) {
      return response;
    }
    final client = body['client'] ?? body['meta']?['client'];
    if (client is Map) {
      final user = client['user'];
      if (user is Map) {
        final passkeys = user['passkeys'];
        if (passkeys is List && passkeys.isNotEmpty) {
          final last = passkeys.last;
          if (last is Map<String, dynamic>) return last;
        }
      }
    }
    if (body['id'] != null && body['object'] == 'passkey') {
      return body;
    }
    return null;
  }

  static String _publishableKey(ClerkAuthState authState) {
    if (AppConfig.clerkPublishableKey.isNotEmpty) {
      return AppConfig.clerkPublishableKey;
    }
    return authState.config.publishableKey;
  }

  static String _clerkFrontendDomain(String publishableKey) {
    final domainStart = publishableKey.lastIndexOf('_') + 1;
    if (domainStart < 1 || domainStart >= publishableKey.length) {
      throw const FormatException('Publishable key format invalid');
    }
    var b64 = publishableKey.substring(domainStart);
    final rem = b64.length % 4;
    if (rem > 0) {
      b64 += '=' * (4 - rem);
    }
    final decoded = utf8.decode(base64.decode(b64));
    return decoded.split(r'$').first;
  }

  /// Signs in with an existing discoverable passkey on this device.
  Future<void> signIn(ClerkAuthState authState) async {
    await authState.attemptSignIn(strategy: clerk.Strategy.passkey);

    if (authState.user != null) {
      await _prefs.setEnabled(true);
      return;
    }

    final verification = authState.signIn?.firstFactorVerification;
    if (verification == null ||
        !verification.strategy.isPasskey ||
        !verification.status.isUnverified) {
      throw Exception('تعذر بدء الدخول بالبصمة. جرّب الإيميل وكلمة المرور.');
    }

    final nonce = verification.nonce;
    if (nonce == null) {
      throw Exception('تعذر تجهيز التحقق بالبصمة.');
    }

    final fapiDomain = _clerkFrontendDomain(_publishableKey(authState));
    final authenticator = PasskeyAuthenticator(debugMode: kDebugMode);
    final requestType = AuthenticateRequestType(
      challenge: nonce.challenge,
      relyingPartyId: fapiDomain,
      mediation: MediationType.Required,
      timeout: nonce.timeout,
      userVerification: nonce.userVerification,
      preferImmediatelyAvailableCredentials: true,
    );
    final res = await authenticator.authenticate(requestType);
    await authState.attemptSignIn(
      strategy: clerk.Strategy.passkey,
      passkeyCredential: res.toJsonString(),
    );

    if (authState.user == null) {
      throw Exception('لم يكتمل الدخول بالبصمة. جرّب الإيميل وكلمة المرور.');
    }
    await _prefs.setEnabled(true);
  }

  Future<void> dismissEnrollPrompt() => _prefs.setPromptDismissed(true);

  /// Allow offering enroll again after a failed attempt.
  Future<void> resetEnrollPrompt() async {
    await _prefs.setPromptDismissed(false);
    await _prefs.setEnabled(false);
  }

  static String _clerkErrorText(clerk.ClerkError error) {
    final text = error.toString().trim();
    if (text.isEmpty) return 'خطأ غير معروف من Clerk';
    return text.length > 180 ? '${text.substring(0, 180)}…' : text;
  }

  static String _shortCause(Object error) {
    final text = error.toString().trim();
    if (text.isEmpty) return '';
    return text.length > 220 ? '${text.substring(0, 220)}…' : text;
  }

  static String _registerFailureMessage(
    Object error, {
    required String rpId,
    required String fapiDomain,
  }) {
    if (error is PasskeyAuthCancelledException) {
      return 'اتلغى طلب البصمة. لو الشاشة ظهرت، وافق عليها وحاول تاني.';
    }
    if (error is MissingGoogleSignInException) {
      return 'لازم تكون مسجّل دخول بحساب Google على الهاتف عشان البصمة تشتغل على أندرويد.';
    }
    if (error is SyncAccountNotAvailableException) {
      return 'حساب مزامنة Google مش جاهز. افتح إعدادات Google وجرب تاني.';
    }
    if (error is DomainNotAssociatedException) {
      return 'نطاق البصمة مش مربوط بالتطبيق.\nRP: $rpId';
    }
    if (error is NoCreateOptionException) {
      return 'مفيش مزوّد بصمة مفعّل على الجهاز. فعّل قفل الشاشة/Google Password Manager.';
    }
    if (error is DeviceNotSupportedException ||
        error is PasskeyUnsupportedException) {
      return 'الجهاز لا يدعم مفاتيح الدخول السريع (Passkeys).';
    }
    if (error is MalformedBase64UrlChallenge) {
      return 'تحدي البصمة من Clerk غير صالح.';
    }
    if (error is MalformedBase64UrlUserID) {
      return 'معرّف المستخدم في تحدي البصمة غير صالح.';
    }
    if (error is TimeoutException) {
      return 'انتهى وقت نافذة البصمة. حاول مرة أخرى.';
    }
    if (error is ExcludeCredentialsCanNotBeRegisteredException) {
      return 'البصمة مسجّلة قبل كده على الجهاز. استخدم دخول بالبصمة.';
    }

    final detail = _shortCause(error);
    if (detail.contains('TYPE_SECURITY_ERROR') ||
        detail.contains('cannot be validated')) {
      return 'أندرويد رفض التحقق من التطبيق (Security Error).\n'
          'RP: $rpId\n'
          'تأكد من حساب Google + Package/SHA في Clerk.\n'
          'النطاق المتوقع: $fapiDomain';
    }
    if (detail.isNotEmpty) {
      return 'فشل تسجيل البصمة على الجهاز:\n$detail\nRP: $rpId';
    }
    return 'فشل تسجيل البصمة على الجهاز. تأكد أن حساب Google مفتوح وأن قفل الشاشة مفعّل.';
  }
}

class _CreatedPasskey {
  const _CreatedPasskey({
    required this.passkeyId,
    required this.nonce,
    this.sdkPasskey,
    this.rawOptions,
  });

  final String passkeyId;
  final clerk.VerificationNonce nonce;
  final clerk.Passkey? sdkPasskey;
  final Map<String, dynamic>? rawOptions;
}

/// User-facing enroll failure (safe to show in dialogs).
class PasskeyEnrollException implements Exception {
  const PasskeyEnrollException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => message;
}
