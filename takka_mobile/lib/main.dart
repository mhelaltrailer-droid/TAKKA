import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app.dart';
import 'core/auth/durable_clerk_persistor.dart';
import 'core/push/push_notification_service.dart';
import 'features/cart/data/cart_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Passed at APK build via --dart-define / dart_defines.json (SENTRY_DSN).
  // Empty means Sentry stays fully disabled — no init, no network calls.
  const sentryDsn = String.fromEnvironment('SENTRY_DSN');

  Future<void> startApp() async {
    final persistor = await DurableClerkPersistor.open();
    await CartStore.instance.ensureLoaded();
    await PushNotificationService.instance.initialize();
    runApp(TakkaApp(persistor: persistor));
  }

  if (sentryDsn.isEmpty) {
    await startApp();
    return;
  }

  await SentryFlutter.init(
    (options) {
      options.dsn = sentryDsn;
      options.tracesSampleRate = 0.1;
      options.sendDefaultPii = false;
    },
    appRunner: startApp,
  );
}
