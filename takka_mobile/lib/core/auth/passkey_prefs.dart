import 'package:shared_preferences/shared_preferences.dart';

const _enabledKey = 'takka.passkeyEnabled';
const _promptDismissedKey = 'takka.passkeyPromptDismissed';

/// Local flags for passkey / biometric quick sign-in on this device.
class PasskeyPrefs {
  const PasskeyPrefs();

  Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) ?? false;
  }

  Future<void> setEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, value);
  }

  Future<bool> isPromptDismissed() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_promptDismissedKey) ?? false;
  }

  Future<void> setPromptDismissed(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_promptDismissedKey, value);
  }
}
