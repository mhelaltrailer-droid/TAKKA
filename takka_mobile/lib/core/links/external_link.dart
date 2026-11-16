import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

/// Shown when no native app and no browser can open the link.
const defaultExternalLinkFailureMessage =
    'تعذر فتح الرابط. تأكد من وجود متصفح أو التطبيق المناسب ثم حاول مرة أخرى.';

const whatsAppLinkFailureMessage =
    'تعذر فتح واتساب. تأكد من تثبيت واتساب أو المتصفح ثم حاول مرة أخرى.';

const mapsLinkFailureMessage =
    'تعذر فتح الخريطة. تأكد من تثبيت خرائط جوجل أو المتصفح ثم حاول مرة أخرى.';

const phoneLinkFailureMessage = 'تعذر فتح تطبيق الاتصال. حاول مرة أخرى.';

typedef ExternalLaunchAttempt = Future<bool> Function(Uri uri, LaunchMode mode);

/// Order matters. Android 11+ hides other apps unless they are declared in
/// `<queries>`. `externalNonBrowserApplication` uses
/// `FLAG_ACTIVITY_REQUIRE_NON_BROWSER` so WhatsApp / Maps / the dialer open
/// when installed. If that throws `ACTIVITY_NOT_FOUND` (only a browser can
/// handle the link, or the native app is missing), fall through to the
/// browser, then an in-app browser for http(s).
List<LaunchMode> externalLaunchModesFor(Uri uri) {
  final modes = <LaunchMode>[
    LaunchMode.externalNonBrowserApplication,
    LaunchMode.externalApplication,
  ];
  if (uri.scheme == 'http' || uri.scheme == 'https') {
    modes
      ..add(LaunchMode.inAppBrowserView)
      ..add(LaunchMode.inAppWebView);
  }
  return modes;
}

Future<bool> _defaultLaunch(Uri uri, LaunchMode mode) {
  return launchUrl(uri, mode: mode);
}

/// Tries each launch mode. A `false` return or any platform error moves on
/// to the next mode. Android's url_launcher throws [PlatformException] with
/// code `ACTIVITY_NOT_FOUND` instead of returning false.
Future<bool> launchExternalUri(
  Uri uri, {
  ExternalLaunchAttempt? attempt,
}) async {
  final launch = attempt ?? _defaultLaunch;
  for (final mode in externalLaunchModesFor(uri)) {
    try {
      final opened = await launch(uri, mode);
      if (opened) {
        return true;
      }
    } catch (_) {
      // Try the next mode. In-app modes also reject non-http schemes.
    }
  }
  return false;
}

/// Opens [uri] outside the app and, if every attempt fails, shows [failureMessage].
Future<bool> openExternalLink(
  BuildContext context,
  Uri uri, {
  String failureMessage = defaultExternalLinkFailureMessage,
  ExternalLaunchAttempt? attempt,
}) async {
  final opened = await launchExternalUri(uri, attempt: attempt);
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(failureMessage)));
  }
  return opened;
}
