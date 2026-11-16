import 'package:flutter_test/flutter_test.dart';
import 'package:takka_mobile/core/push/push_target.dart';

void main() {
  test('parses a kitchen new-order payload', () {
    final target = PushTarget.tryParse({
      'audience': 'kitchen',
      'route': 'kitchen_orders',
      'orderId': 'ord_1',
      'title': 'طلب جديد',
      'body': 'تم استلام طلب جديد برقم 12.',
    });

    expect(target?.audience, PushAudience.kitchen);
    expect(target?.route, PushRoute.kitchenOrders);
    expect(target?.orderId, 'ord_1');
    expect(target?.title, 'طلب جديد');
  });

  test('drops an empty order id and unknown routes', () {
    final home = PushTarget.tryParse({
      'audience': 'kitchen',
      'route': 'kitchen_home',
      'orderId': '',
    });
    expect(home?.orderId, isNull);
    expect(home?.route, PushRoute.kitchenHome);

    expect(
      PushTarget.tryParse({'audience': 'customer', 'route': 'somewhere'}),
      isNull,
    );
  });
}
