import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'push_target.dart';
import 'push_token_api.dart';

/// Must match TAKKA_PUSH_CHANNEL_ID on the server and the Android manifest.
const takkaPushChannelId = 'takka_alerts';

@pragma('vm:entry-point')
Future<void> takkaFirebaseBackgroundHandler(RemoteMessage message) async {
  // Notification payloads are shown by Android while the app is backgrounded.
  // Initializing Firebase keeps the background isolate from crashing if a
  // data message arrives after the project is configured.
  try {
    await Firebase.initializeApp();
  } catch (_) {}
}

typedef PushTargetHandler = bool Function(PushTarget target);

class PushNotificationService with WidgetsBindingObserver {
  PushNotificationService._({PushTokenApi? api})
    : _api = api ?? const PushTokenApi();

  static final PushNotificationService instance = PushNotificationService._();

  final PushTokenApi _api;
  final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();
  final List<PushTargetHandler> _listeners = [];

  Future<String?> Function()? _sessionToken;
  PushTarget? _pending;
  String? _lastToken;
  var _started = false;
  var _firebaseReady = false;
  var _observing = false;

  bool get isReady => _firebaseReady;

  Future<void> initialize() async {
    if (_started) {
      return;
    }
    _started = true;
    if (!_observing) {
      WidgetsBinding.instance.addObserver(this);
      _observing = true;
    }
    await _initLocalNotifications();
    await _initFirebase();
  }

  void bindSession(Future<String?> Function() provider) {
    _sessionToken = provider;
  }

  void addListener(PushTargetHandler handler) {
    _listeners.add(handler);
  }

  void removeListener(PushTargetHandler handler) {
    _listeners.remove(handler);
  }

  void deliver(PushTarget target) {
    for (final handler in List<PushTargetHandler>.of(_listeners)) {
      if (handler(target)) {
        if (identical(_pending, target)) {
          _pending = null;
        }
        return;
      }
    }
    _pending = target;
  }

  void flushPending(PushAudience audience) {
    final pending = _pending;
    if (pending == null || pending.audience != audience) {
      return;
    }
    deliver(pending);
  }

  Future<void> ensureEnabled(
    BuildContext context, {
    required PushAudience audience,
  }) async {
    if (!_firebaseReady) {
      return;
    }

    NotificationSettings settings;
    try {
      settings = await FirebaseMessaging.instance.getNotificationSettings();
    } catch (_) {
      return;
    }
    if (!context.mounted) {
      return;
    }

    final status = settings.authorizationStatus;
    if (status == AuthorizationStatus.authorized ||
        status == AuthorizationStatus.provisional) {
      await syncToken();
      return;
    }
    if (status == AuthorizationStatus.denied ||
        status == AuthorizationStatus.deniedPermanently) {
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    if (!context.mounted) {
      return;
    }
    final promptKey = audience == PushAudience.kitchen
        ? 'takka_push_prompted_kitchen'
        : 'takka_push_prompted_customer';
    if (prefs.getBool(promptKey) ?? false) {
      return;
    }

    final allow = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        final body = audience == PushAudience.kitchen
            ? 'عشان يوصلك تنبيه بصوت لما يجي طلب جديد، أو رسالة، أو تحديث على المطبخ حتى لو التطبيق مقفول، اسمح بالإشعارات.'
            : 'عشان توصلك تحديثات الطلب والرسائل حتى لو التطبيق مقفول، اسمح بالإشعارات.';
        return AlertDialog(
          title: const Text('تنبيهات الطلبات'),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('لاحقًا'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('السماح بالإشعارات'),
            ),
          ],
        );
      },
    );
    await prefs.setBool(promptKey, true);
    if (allow != true || !context.mounted) {
      return;
    }

    try {
      final result = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (result.authorizationStatus == AuthorizationStatus.authorized ||
          result.authorizationStatus == AuthorizationStatus.provisional) {
        await syncToken();
      }
    } catch (_) {}
  }

  Future<void> syncToken() async {
    if (!_firebaseReady) {
      return;
    }
    final provider = _sessionToken;
    if (provider == null) {
      return;
    }
    try {
      final jwt = await provider();
      if (jwt == null || jwt.isEmpty) {
        return;
      }
      // Registration tokens still send through firebase-admin. The FID
      // replacement does not return the current token on demand.
      // ignore: deprecated_member_use
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) {
        return;
      }
      _lastToken = token;
      final platform = defaultTargetPlatform == TargetPlatform.iOS
          ? 'ios'
          : 'android';
      await _api.register(sessionToken: jwt, token: token, platform: platform);
    } catch (error) {
      debugPrint('Takka push token sync skipped: $error');
    }
  }

  Future<void> unregister({required String sessionToken}) async {
    final token = _lastToken;
    _sessionToken = null;
    _lastToken = null;
    _pending = null;
    if (!_firebaseReady) {
      return;
    }
    try {
      // ignore: deprecated_member_use
      final fcmToken = token ?? await FirebaseMessaging.instance.getToken();
      if (fcmToken == null || fcmToken.isEmpty) {
        return;
      }
      await _api.unregister(sessionToken: sessionToken, token: fcmToken);
    } catch (error) {
      debugPrint('Takka push token unregister skipped: $error');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(syncToken());
    }
  }

  Future<void> _initLocalNotifications() async {
    try {
      await _local.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        ),
        onDidReceiveNotificationResponse: _onLocalNotification,
      );
      await _local
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(
            const AndroidNotificationChannel(
              takkaPushChannelId,
              'تنبيهات تكة',
              description: 'طلبات جديدة ورسائل وتحديثات المطبخ',
              importance: Importance.high,
              playSound: true,
            ),
          );
    } catch (error) {
      debugPrint('Takka local notifications skipped: $error');
    }
  }

  Future<void> _initFirebase() async {
    if (kIsWeb) {
      return;
    }
    try {
      await Firebase.initializeApp();
      _firebaseReady = true;
    } catch (error) {
      _firebaseReady = false;
      debugPrint('Takka Firebase is not configured. Push stays off. $error');
      return;
    }

    FirebaseMessaging.onBackgroundMessage(takkaFirebaseBackgroundHandler);
    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onOpened);
    // ignore: deprecated_member_use
    FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      _lastToken = token;
      unawaited(syncToken());
    });

    try {
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        _onOpened(initial);
      }
    } catch (_) {}
  }

  void _onOpened(RemoteMessage message) {
    final target = PushTarget.tryParse(message.data);
    if (target != null) {
      deliver(target);
    }
  }

  Future<void> _onForegroundMessage(RemoteMessage message) async {
    final data = message.data;
    final title =
        message.notification?.title ??
        data['title']?.toString() ??
        'إشعار جديد من تكة';
    final body =
        message.notification?.body ??
        data['body']?.toString() ??
        'لديك تحديث جديد.';
    try {
      await _local.show(
        id: _notificationId(data['notificationId']?.toString() ?? title),
        title: title,
        body: body,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            takkaPushChannelId,
            'تنبيهات تكة',
            channelDescription: 'طلبات جديدة ورسائل وتحديثات المطبخ',
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            icon: '@mipmap/ic_launcher',
          ),
        ),
        payload: jsonEncode(data),
      );
    } catch (error) {
      debugPrint('Takka foreground notification skipped: $error');
    }
  }

  void _onLocalNotification(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null || payload.isEmpty) {
      return;
    }
    try {
      final decoded = jsonDecode(payload);
      if (decoded is! Map) {
        return;
      }
      final target = PushTarget.tryParse(Map<String, dynamic>.from(decoded));
      if (target != null) {
        deliver(target);
      }
    } catch (_) {}
  }

  int _notificationId(String seed) {
    final hash = seed.hashCode & 0x7fffffff;
    return hash == 0 ? 1 : hash;
  }
}
