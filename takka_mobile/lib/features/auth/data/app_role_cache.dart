import 'package:shared_preferences/shared_preferences.dart';

import 'app_role.dart';

/// Small key/value store so tests can avoid plugin channels.
abstract class AppRoleStore {
  Future<String?> read(String key);

  Future<void> write(String key, String value);

  Future<void> delete(String key);
}

class SharedPrefsAppRoleStore implements AppRoleStore {
  const SharedPrefsAppRoleStore();

  @override
  Future<String?> read(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  @override
  Future<void> write(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  @override
  Future<void> delete(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }
}

/// Last known app role, scoped to the Clerk user id.
///
/// Reopen can route before `/api/mobile/me` answers. A different account
/// does not inherit the previous user's role.
class AppRoleCache {
  AppRoleCache({AppRoleStore? store})
    : _store = store ?? const SharedPrefsAppRoleStore();

  static const userKey = 'takka_last_known_role_user';
  static const roleKey = 'takka_last_known_role';

  final AppRoleStore _store;

  Future<AppRole?> read({required String? userId}) async {
    if (userId == null || userId.isEmpty) return null;
    final storedUser = await _store.read(userKey);
    if (storedUser != userId) return null;
    return AppRoleX.fromApiValue(await _store.read(roleKey));
  }

  Future<void> write({required String userId, required AppRole role}) async {
    await _store.write(userKey, userId);
    await _store.write(roleKey, role.apiValue);
  }

  Future<void> clear() async {
    await _store.delete(userKey);
    await _store.delete(roleKey);
  }
}
