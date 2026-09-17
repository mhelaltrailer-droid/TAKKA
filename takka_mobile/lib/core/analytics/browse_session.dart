import 'package:shared_preferences/shared_preferences.dart';

const _browseSessionKey = 'takka_browse_session_key';

Future<String> getOrCreateBrowseSessionKey() async {
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_browseSessionKey);
  if (existing != null && existing.length >= 8) {
    return existing;
  }
  final created =
      'sess_${DateTime.now().microsecondsSinceEpoch}_${DateTime.now().millisecondsSinceEpoch}';
  await prefs.setString(_browseSessionKey, created);
  return created;
}
