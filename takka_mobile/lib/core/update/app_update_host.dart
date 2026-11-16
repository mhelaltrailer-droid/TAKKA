import 'dart:async';

import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';
import 'app_update_client.dart';
import 'app_update_policy.dart';

const _checkedAtKey = 'app_update_checked_at_ms';
const _snoozeBuildKey = 'app_update_snooze_build';
const _snoozeUntilKey = 'app_update_snooze_until_ms';

class AppUpdateHost extends StatefulWidget {
  const AppUpdateHost({super.key, required this.home});

  final Widget home;

  @override
  State<AppUpdateHost> createState() => _AppUpdateHostState();
}

class _AppUpdateHostState extends State<AppUpdateHost> with WidgetsBindingObserver {
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _client = const AppUpdateClient();

  DateTime? _lastCheck;
  var _checking = false;
  var _dialogOpen = false;
  var _launchCheckStarted = false;
  var _loadedStoredCheck = false;

  bool get _isWidgetTest {
    final name = WidgetsBinding.instance.runtimeType.toString();
    return name.contains('TestWidgetsFlutterBinding');
  }

  @override
  void initState() {
    super.initState();
    if (_isWidgetTest) {
      return;
    }
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_check(launch: true));
    });
  }

  @override
  void dispose() {
    if (!_isWidgetTest) {
      WidgetsBinding.instance.removeObserver(this);
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _launchCheckStarted) {
      unawaited(_check(launch: false));
    }
  }

  Future<void> _check({required bool launch}) async {
    if (_checking || _dialogOpen) {
      return;
    }
    await _loadStoredCheck();
    if (!shouldFetchAppUpdate(launch: launch, lastCheck: _lastCheck, now: DateTime.now())) {
      return;
    }

    _checking = true;
    if (launch) {
      _launchCheckStarted = true;
    }
    try {
      final info = await PackageInfo.fromPlatform();
      final currentBuild = int.tryParse(info.buildNumber) ?? 0;
      final remote = await _client.fetch();
      _lastCheck = DateTime.now();
      await _persistCheckTime(_lastCheck!);
      if (!mounted || remote == null) {
        return;
      }

      final kind = decideAppUpdate(
        currentBuild: currentBuild,
        latestBuild: remote.latestBuild,
        minBuild: remote.minBuild,
      );
      final prefs = await _readPrefs();
      final snoozedUntilMs = prefs?.getInt(_snoozeUntilKey);
      if (!shouldShowAppUpdatePrompt(
        kind: kind,
        latestBuild: remote.latestBuild,
        snoozedBuild: prefs?.getInt(_snoozeBuildKey),
        snoozedUntil: snoozedUntilMs == null
            ? null
            : DateTime.fromMillisecondsSinceEpoch(snoozedUntilMs),
        now: DateTime.now(),
      )) {
        return;
      }
      await _showPrompt(kind: kind, remote: remote);
    } catch (_) {
      // Unreachable endpoint, bad JSON, or a missing plugin must not block launch.
    } finally {
      _checking = false;
    }
  }

  Future<void> _loadStoredCheck() async {
    if (_loadedStoredCheck) {
      return;
    }
    _loadedStoredCheck = true;
    final prefs = await _readPrefs();
    final stored = prefs?.getInt(_checkedAtKey);
    if (stored != null && _lastCheck == null) {
      _lastCheck = DateTime.fromMillisecondsSinceEpoch(stored);
    }
  }

  Future<SharedPreferences?> _readPrefs() async {
    try {
      return await SharedPreferences.getInstance();
    } catch (_) {
      return null;
    }
  }

  Future<void> _persistCheckTime(DateTime time) async {
    final prefs = await _readPrefs();
    await prefs?.setInt(_checkedAtKey, time.millisecondsSinceEpoch);
  }

  Future<void> _snooze(int latestBuild) async {
    final prefs = await _readPrefs();
    if (prefs == null) {
      return;
    }
    final until = DateTime.now().add(appUpdateOptionalSnooze);
    await prefs.setInt(_snoozeBuildKey, latestBuild);
    await prefs.setInt(_snoozeUntilKey, until.millisecondsSinceEpoch);
  }

  Future<void> _showPrompt({
    required AppUpdateKind kind,
    required RemoteAppVersion remote,
  }) async {
    if (!mounted || kind == AppUpdateKind.none) {
      return;
    }

    final forced = kind == AppUpdateKind.required;
    while (mounted) {
      final navContext = _navigatorKey.currentContext;
      if (navContext == null || !navContext.mounted) {
        return;
      }
      _dialogOpen = true;
      final action = await showDialog<String>(
        context: navContext,
        barrierDismissible: !forced,
        builder: (context) {
          return _UpdateDialog(forced: forced, remote: remote);
        },
      );
      _dialogOpen = false;
      if (!mounted) {
        return;
      }

      if (action == 'update') {
        final opened = await _openDownload(remote.downloadUrl);
        if (!opened) {
          await _showLinkFallback(remote.downloadUrl);
        }
      } else if (!forced) {
        await _snooze(remote.latestBuild);
      }

      if (!forced || !mounted) {
        return;
      }
    }
  }

  Future<bool> _openDownload(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      return false;
    }
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  Future<void> _showLinkFallback(String url) async {
    final navContext = _navigatorKey.currentContext;
    if (navContext == null) {
      return;
    }
    await showDialog<void>(
      context: navContext,
      builder: (context) {
        return Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            title: const Text('مش قادرين نفتح رابط التحميل'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('انسخ الرابط وافتحه من المتصفح:'),
                const SizedBox(height: 12),
                SelectableText(url),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('تمام'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'تكة',
      debugShowCheckedModeBanner: false,
      theme: buildTakkaTheme(),
      home: widget.home,
    );
  }
}

class _UpdateDialog extends StatelessWidget {
  const _UpdateDialog({required this.forced, required this.remote});

  final bool forced;
  final RemoteAppVersion remote;

  @override
  Widget build(BuildContext context) {
    final versionLine = remote.latestVersion.isEmpty
        ? ''
        : 'النسخة ${remote.latestVersion}';
    final body = forced
        ? 'النسخة اللي عندك قديمة ومش هتقدر تكمل استخدام تكة بيها. حمّل النسخة الجديدة عشان تفضل تطلب وتستقبل الطلبات.'
        : 'نزلت نسخة أحدث من تكة. حدّث التطبيق لما يناسبك.';

    return PopScope(
      canPop: !forced,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          title: Text(forced ? 'لازم تحدّث التطبيق' : 'فيه نسخة جديدة'),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(body),
                  if (versionLine.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(versionLine),
                  ],
                  if (remote.releaseNotesAr.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Text('الجديد'),
                    const SizedBox(height: 4),
                    Text(remote.releaseNotesAr),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => Navigator.of(context).pop('update'),
                    child: const Text('تحديث الآن'),
                  ),
                  if (!forced) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop('later'),
                      child: const Text('لاحقًا'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
