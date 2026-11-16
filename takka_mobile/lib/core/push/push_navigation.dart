import 'package:flutter/material.dart';

import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/orders/presentation/kitchen_orders_screen.dart';
import '../../features/orders/presentation/order_tracking_screen.dart';
import 'push_target.dart';

void openPushTarget(BuildContext context, PushTarget target) {
  switch (target.route) {
    case PushRoute.kitchenOrders:
      Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const KitchenOrdersScreen()),
      );
    case PushRoute.kitchenHome:
      return;
    case PushRoute.orderTracking:
      final orderId = target.orderId;
      if (orderId == null) {
        Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
        );
        return;
      }
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OrderTrackingScreen(orderId: orderId),
        ),
      );
    case PushRoute.notifications:
      Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const NotificationsScreen()),
      );
  }
}
