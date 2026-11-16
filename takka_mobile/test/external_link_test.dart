import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:takka_mobile/core/links/external_link.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  test('https prefers the native app, then the browser, then in-app', () {
    final modes = externalLaunchModesFor(
      Uri.parse('https://wa.me/201012345678'),
    );

    expect(modes, [
      LaunchMode.externalNonBrowserApplication,
      LaunchMode.externalApplication,
      LaunchMode.inAppBrowserView,
      LaunchMode.inAppWebView,
    ]);
  });

  test('tel does not fall through to an in-app browser', () {
    expect(externalLaunchModesFor(Uri.parse('tel:+201012345678')), [
      LaunchMode.externalNonBrowserApplication,
      LaunchMode.externalApplication,
    ]);
  });

  test('stops at the first mode that opens', () async {
    final tried = <LaunchMode>[];
    final opened = await launchExternalUri(
      Uri.parse('https://www.google.com/maps?q=30,31'),
      attempt: (uri, mode) async {
        tried.add(mode);
        return mode == LaunchMode.externalApplication;
      },
    );

    expect(opened, isTrue);
    expect(tried, [
      LaunchMode.externalNonBrowserApplication,
      LaunchMode.externalApplication,
    ]);
  });

  test(
    'continues after Android ACTIVITY_NOT_FOUND and reports total failure',
    () async {
      final tried = <LaunchMode>[];
      final opened = await launchExternalUri(
        Uri.parse('https://chat.whatsapp.com/example'),
        attempt: (uri, mode) async {
          tried.add(mode);
          throw PlatformException(
            code: 'ACTIVITY_NOT_FOUND',
            message: 'No Activity found to handle intent',
          );
        },
      );

      expect(opened, isFalse);
      expect(tried, externalLaunchModesFor(Uri.parse('https://example.com')));
    },
  );
}
