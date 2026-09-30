import 'dart:io';

import 'package:clerk_auth/clerk_auth.dart' as clerk;
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:passkeys/authenticator.dart';
import 'package:passkeys/types.dart';

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
    late final clerk.Passkey passkey;
    try {
      final created = await authState.createPasskey();
      if (created == null) {
        throw const PasskeyEnrollException(
          'تعذر بدء إنشاء مفتاح الدخول السريع.',
        );
      }
      passkey = created;
    } catch (error) {
      if (error is PasskeyEnrollException) rethrow;
      throw PasskeyEnrollException(
        'تعذر إنشاء مفتاح البصمة من Clerk. '
        'تأكد أن Passkeys مفعّلة في الـ Dashboard.',
        cause: error,
      );
    }

    final nonce = passkey.verification?.nonce;
    if (nonce == null) {
      throw const PasskeyEnrollException(
        'Clerk لم يرجع تحدي البصمة. راجع إعداد Passkeys وNative Android.',
      );
    }
    if (nonce.user == null ||
        nonce.user!.id.isEmpty ||
        nonce.relyingParty.id.isEmpty) {
      throw const PasskeyEnrollException(
        'بيانات المستخدم أو نطاق البصمة ناقصة من Clerk.',
      );
    }

    final rpName = nonce.relyingParty.name?.trim().isNotEmpty == true
        ? nonce.relyingParty.name!
        : nonce.relyingParty.id;
    final userName = nonce.user!.name.trim().isNotEmpty
        ? nonce.user!.name
        : (nonce.user!.displayName.trim().isNotEmpty
            ? nonce.user!.displayName
            : nonce.user!.id);
    final displayName = nonce.user!.displayName.trim().isNotEmpty
        ? nonce.user!.displayName
        : userName;

    final authenticator = PasskeyAuthenticator(debugMode: kDebugMode);
    final challenge = RegisterRequestType(
      challenge: nonce.challenge,
      relyingParty: RelyingPartyType(
        name: rpName,
        id: nonce.relyingParty.id,
      ),
      user: UserType(
        displayName: displayName,
        name: userName,
        id: nonce.user!.id,
      ),
      excludeCredentials: const [],
      timeout: nonce.timeout,
      authSelectionType: AuthenticatorSelectionType(
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        residentKey: '',
        userVerification: '',
      ),
    );

    try {
      final res = await authenticator.register(challenge);
      await authState.attemptPasskeyVerification(passkey, res.toJsonString());
    } catch (error) {
      throw PasskeyEnrollException(
        'فشل تسجيل البصمة على الجهاز. '
        'تأكد من Package + SHA-256 في Clerk وأن البصمة مفعّلة.',
        cause: error,
      );
    }

    await _prefs.setEnabled(true);
    await _prefs.setPromptDismissed(true);
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

    final authenticator = PasskeyAuthenticator(debugMode: kDebugMode);
    final requestType = AuthenticateRequestType(
      challenge: nonce.challenge,
      relyingPartyId: nonce.relyingParty.id,
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
}

/// User-facing enroll failure (safe to show in dialogs).
class PasskeyEnrollException implements Exception {
  const PasskeyEnrollException(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => message;
}
