import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

import '../config/app_config.dart';

class PusherRealtimeService {
  PusherRealtimeService._();

  static final PusherRealtimeService instance = PusherRealtimeService._();

  final PusherChannelsFlutter _client = PusherChannelsFlutter.getInstance();
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
    required void Function(PusherEvent event) onEvent,
  }) async {
    if (!AppConfig.hasPusher) {
      return;
    }

    await _ensureReady();
    await _client.subscribe(
      channelName: channelName,
      onEvent: onEvent,
    );
  }

  Future<void> unsubscribe(String channelName) async {
    if (!AppConfig.hasPusher || !_initialized) {
      return;
    }

    await _client.unsubscribe(channelName: channelName);
  }
}
