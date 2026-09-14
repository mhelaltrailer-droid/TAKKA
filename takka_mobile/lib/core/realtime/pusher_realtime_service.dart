import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

import '../config/app_config.dart';

typedef PusherEventHandler = void Function(PusherEvent event);

class PusherRealtimeService {
  PusherRealtimeService._();

  static final PusherRealtimeService instance = PusherRealtimeService._();

  final PusherChannelsFlutter _client = PusherChannelsFlutter.getInstance();
  final Map<String, Set<PusherEventHandler>> _listeners = {};
  bool _initialized = false;
  bool _connected = false;

  Future<void> _ensureReady() async {
    if (!AppConfig.hasPusher || _initialized) {
      if (AppConfig.hasPusher && !_connected) {
        await _client.connect();
        _connected = true;
      }
      return;
    }

    await _client.init(
      apiKey: AppConfig.pusherKey,
      cluster: AppConfig.pusherCluster,
      onConnectionStateChange: (currentState, previousState) {
        _connected = currentState == 'CONNECTED';
      },
      onError: (message, code, error) {},
    );

    _initialized = true;
    await _client.connect();
    _connected = true;
  }

  Future<void> subscribe({
    required String channelName,
    required PusherEventHandler onEvent,
  }) async {
    if (!AppConfig.hasPusher) {
      return;
    }

    await _ensureReady();

    final listeners = _listeners.putIfAbsent(channelName, () => <PusherEventHandler>{});
    final isFirst = listeners.isEmpty;
    listeners.add(onEvent);

    if (!isFirst) {
      return;
    }

    await _client.subscribe(
      channelName: channelName,
      onEvent: (event) {
        final handlers = _listeners[channelName];
        if (handlers == null || handlers.isEmpty) {
          return;
        }
        for (final handler in List<PusherEventHandler>.from(handlers)) {
          handler(event);
        }
      },
    );
  }

  /// Remove one listener, or all listeners for [channelName] when [onEvent] is null.
  Future<void> unsubscribe(
    String channelName, {
    PusherEventHandler? onEvent,
  }) async {
    if (!AppConfig.hasPusher || !_initialized) {
      return;
    }

    final listeners = _listeners[channelName];
    if (listeners == null) {
      return;
    }

    if (onEvent != null) {
      listeners.remove(onEvent);
    } else {
      listeners.clear();
    }

    if (listeners.isEmpty) {
      _listeners.remove(channelName);
      await _client.unsubscribe(channelName: channelName);
    }
  }
}
