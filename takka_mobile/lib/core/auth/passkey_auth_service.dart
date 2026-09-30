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
    final passkey = await authState.createPasskey();
    final nonce = passkey?.verification?.nonce;
    if (passkey == null || nonce == null) {
      throw Exception('تعذر بدء إنشاء مفتاح الدخول السريع.');
    }
    if (nonce.user == null || nonce.relyingParty.name == null) {
      throw Exception('بيانات المستخدم ناقصة لإنشاء مفتاح الدخول.');
    }

    final authenticator = PasskeyAuthenticator(debugMode: kDebugMode);
    final challenge = RegisterRequestType(
      challenge: nonce.challenge,
      relyingParty: RelyingPartyType(
        name: nonce.relyingParty.name!,
        id: nonce.relyingParty.id,
      ),
      user: UserType(
        displayName: nonce.user!.displayName,
        name: nonce.user!.name,
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

    final res = await authenticator.register(challenge);
    await authState.attemptPasskeyVerification(passkey, res.toJsonString());
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
}
