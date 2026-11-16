enum PushAudience { kitchen, customer }

enum PushRoute { kitchenOrders, kitchenHome, orderTracking, notifications }

class PushTarget {
  const PushTarget({
    required this.audience,
    required this.route,
    this.orderId,
    this.title = '',
    this.body = '',
  });

  final PushAudience audience;
  final PushRoute route;
  final String? orderId;
  final String title;
  final String body;

  static PushTarget? tryParse(Map<String, dynamic> data) {
    final audience = switch (data['audience']?.toString()) {
      'kitchen' => PushAudience.kitchen,
      'customer' => PushAudience.customer,
      _ => null,
    };
    final route = switch (data['route']?.toString()) {
      'kitchen_orders' => PushRoute.kitchenOrders,
      'kitchen_home' => PushRoute.kitchenHome,
      'order_tracking' => PushRoute.orderTracking,
      'notifications' => PushRoute.notifications,
      _ => null,
    };
    if (audience == null || route == null) {
      return null;
    }
    final orderId = data['orderId']?.toString();
    return PushTarget(
      audience: audience,
      route: route,
      orderId: orderId == null || orderId.isEmpty ? null : orderId,
      title: data['title']?.toString() ?? '',
      body: data['body']?.toString() ?? '',
    );
  }
}
