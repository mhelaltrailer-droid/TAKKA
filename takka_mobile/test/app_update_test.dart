import 'package:flutter_test/flutter_test.dart';
import 'package:takka_mobile/core/update/app_update_client.dart';
import 'package:takka_mobile/core/update/app_update_policy.dart';

void main() {
  final now = DateTime(2026, 11, 16, 12);

  test('decides optional, required, and no update from build numbers', () {
    expect(
      decideAppUpdate(currentBuild: 4, latestBuild: 5, minBuild: 3),
      AppUpdateKind.optional,
    );
    expect(
      decideAppUpdate(currentBuild: 2, latestBuild: 5, minBuild: 3),
      AppUpdateKind.required,
    );
    expect(
      decideAppUpdate(currentBuild: 5, latestBuild: 5, minBuild: 3),
      AppUpdateKind.none,
    );
    expect(
      decideAppUpdate(currentBuild: 9, latestBuild: 5, minBuild: 0),
      AppUpdateKind.none,
    );
    expect(
      decideAppUpdate(currentBuild: 0, latestBuild: 5, minBuild: 1),
      AppUpdateKind.none,
    );
  });

  test('launch always checks and resume is throttled for six hours', () {
    expect(
      shouldFetchAppUpdate(launch: true, lastCheck: now, now: now),
      isTrue,
    );
    expect(
      shouldFetchAppUpdate(
        launch: false,
        lastCheck: now.subtract(const Duration(hours: 5)),
        now: now,
      ),
      isFalse,
    );
    expect(
      shouldFetchAppUpdate(
        launch: false,
        lastCheck: now.subtract(appUpdateResumeThrottle),
        now: now,
      ),
      isTrue,
    );
    expect(
      shouldFetchAppUpdate(launch: false, lastCheck: null, now: now),
      isTrue,
    );
  });

  test('optional prompt can be snoozed and a forced update cannot', () {
    expect(
      shouldShowAppUpdatePrompt(
        kind: AppUpdateKind.optional,
        latestBuild: 5,
        snoozedBuild: 5,
        snoozedUntil: now.add(const Duration(hours: 1)),
        now: now,
      ),
      isFalse,
    );
    expect(
      shouldShowAppUpdatePrompt(
        kind: AppUpdateKind.optional,
        latestBuild: 6,
        snoozedBuild: 5,
        snoozedUntil: now.add(const Duration(hours: 1)),
        now: now,
      ),
      isTrue,
    );
    expect(
      shouldShowAppUpdatePrompt(
        kind: AppUpdateKind.required,
        latestBuild: 5,
        snoozedBuild: 5,
        snoozedUntil: now.add(const Duration(days: 1)),
        now: now,
      ),
      isTrue,
    );
    expect(
      shouldShowAppUpdatePrompt(
        kind: AppUpdateKind.none,
        latestBuild: 5,
        snoozedBuild: null,
        snoozedUntil: null,
        now: now,
      ),
      isFalse,
    );
  });

  test('parses a usable payload and ignores an unconfigured response', () {
    final parsed = RemoteAppVersion.tryParse('''
      {
        "configured": true,
        "latestVersion": "1.2.0",
        "latestBuild": 5,
        "minBuild": 3,
        "downloadUrl": "https://example.com/takka.apk",
        "releaseNotesAr": "فيه نسخة جديدة"
      }
    ''');
    expect(parsed, isNotNull);
    expect(parsed!.latestBuild, 5);
    expect(parsed.minBuild, 3);
    expect(parsed.releaseNotesAr, 'فيه نسخة جديدة');

    expect(
      RemoteAppVersion.tryParse('{"configured":false,"reason":"not set"}'),
      isNull,
    );
    expect(RemoteAppVersion.tryParse('not-json'), isNull);
    expect(
      RemoteAppVersion.tryParse(
        '{"configured":true,"latestBuild":2,"minBuild":0,"downloadUrl":"notaurl"}',
      ),
      isNull,
    );
  });
}
