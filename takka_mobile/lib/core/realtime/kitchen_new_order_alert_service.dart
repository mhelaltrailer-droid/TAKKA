import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

import 'pusher_realtime_service.dart';

/// Foreground-only kitchen alert: plays a system ringtone when a new order arrives.
class KitchenNewOrderAlertService {
  KitchenNewOrderAlertService._();

  static final KitchenNewOrderAlertService instance =
      KitchenNewOrderAlertService._();

  final _ringtone = FlutterRingtonePlayer();
  String? _channelName;
  var _active = false;

  Future<void> start({required String appUserId}) async {
    final channelName = 'user-$appUserId';
    if (_active && _channelName == channelName) {
      return;
    }

    await stop();
    _channelName = channelName;
    _active = true;

    await PusherRealtimeService.instance.subscribe(
      channelName: channelName,
      onEvent: _onEvent,
    );
  }

  Future<void> stop() async {
    final channelName = _channelName;
    _active = false;
    _channelName = null;
    if (channelName != null) {
      await PusherRealtimeService.instance.unsubscribe(
        channelName,
        onEvent: _onEvent,
      );
    }
    try {
      await _ringtone.stop();
    } catch (_) {}
  }

  void _onEvent(PusherEvent event) {
    if (!_active || event.eventName != 'notification:new') {
      return;
    }

    try {
      final raw = event.data;
      if (raw == null) {
        return;
      }
      final decoded = raw is String
          ? (raw.isEmpty ? null : jsonDecode(raw))
          : raw;
      if (decoded is! Map) {
        return;
      }
      final type = decoded['type']?.toString();
      final title = decoded['title']?.toString() ?? '';
      final isNewOrder = type == 'ORDER' && title.contains('طلب جديد');
      if (!isNewOrder) {
        return;
      }
      playNewOrderSound();
    } catch (_) {}
  }

  Future<void> playNewOrderSound() async {
    try {
      await HapticFeedback.heavyImpact();
      // Short notification chime; asAlarm helps Android play loudly in foreground.
      await _ringtone.playNotification(
        looping: false,
        volume: 1,
        asAlarm: true,
      );
    } catch (_) {
      try {
        await SystemSound.play(SystemSoundType.alert);
      } catch (_) {}
    }
  }
}
