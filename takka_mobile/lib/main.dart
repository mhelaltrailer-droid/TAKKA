import 'package:flutter/widgets.dart';

import 'app.dart';
import 'core/auth/durable_clerk_persistor.dart';
import 'core/push/push_notification_service.dart';
import 'features/cart/data/cart_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final persistor = await DurableClerkPersistor.open();
  await CartStore.instance.ensureLoaded();
  await PushNotificationService.instance.initialize();
  runApp(TakkaApp(persistor: persistor));
}
