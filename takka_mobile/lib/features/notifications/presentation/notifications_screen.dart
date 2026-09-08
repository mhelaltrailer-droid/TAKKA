import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../auth/data/mobile_me_service.dart';
import '../../cart/data/order_service.dart';
import '../../../core/realtime/pusher_realtime_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _orderService = const OrderService();
  final _meService = const MobileMeService();
  Future<List<AppNotification>>? _future;
  String? _userChannelName;

  @override
  void initState() {
    super.initState();
    _future = _load();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    final channelName = _userChannelName;
    if (channelName != null) {
      PusherRealtimeService.instance.unsubscribe(channelName);
    }
    super.dispose();
  }

  Future<List<AppNotification>> _load() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _orderService.loadNotifications(sessionToken: token.jwt);
  }

  Future<void> _subscribeRealtime() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final appUserId = await _meService.loadAppUserId(sessionToken: token.jwt);
      final channelName = 'user-$appUserId';
      _userChannelName = channelName;
      await PusherRealtimeService.instance.subscribe(
        channelName: channelName,
        onEvent: (event) {
          if (!mounted || event.eventName != 'notification:new') {
            return;
          }
          setState(() => _future = _load());
        },
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الإشعارات'),
      ),
      body: FutureBuilder<List<AppNotification>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(snapshot.error.toString(), textAlign: TextAlign.center),
              ),
            );
          }

          final notifications = snapshot.data ?? const [];
          if (notifications.isEmpty) {
            return const Center(
              child: Text(
                'لا توجد إشعارات بعد.',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              final future = _load();
              setState(() => _future = future);
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: notifications
                  .map(
                    (notification) => Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      color: notification.isRead ? null : const Color(0xFFFFFBEB),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(18),
                        title: Text(
                          notification.title,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(notification.body),
                        ),
                        trailing: notification.isRead
                            ? const Icon(Icons.done_all_rounded)
                            : TextButton(
                                onPressed: () async {
                                  final authState =
                                      ClerkAuth.of(context, listen: false);
                                  final token = await authState.sessionToken();
                                  await _orderService.markNotificationRead(
                                    sessionToken: token.jwt,
                                    notificationId: notification.id,
                                  );
                                  setState(() => _future = _load());
                                },
                                child: const Text('قراءة'),
                              ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          );
        },
      ),
    );
  }
}
