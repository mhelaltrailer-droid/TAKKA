import 'package:flutter_test/flutter_test.dart';
import 'package:takka_mobile/core/support/support_whatsapp.dart';
import 'package:takka_mobile/features/cart/data/cart_store.dart';
import 'package:takka_mobile/features/orders/data/order_history_groups.dart';

void main() {
  test('support number defaults and still reads an unconfigured app-version payload', () {
    expect(supportNumberFromAppVersionBody(null), defaultSupportWhatsappNumber);
    expect(
      supportNumberFromAppVersionBody(
        '{"configured":false,"reason":"not set","supportWhatsappNumber":"+201000000000"}',
      ),
      '+201000000000',
    );
    expect(
      supportNumberFromAppVersionBody(
        '{"configured":true,"supportWhatsappNumber":"not-a-phone"}',
      ),
      defaultSupportWhatsappNumber,
    );
  });

  test('support message carries the order, kitchen, and chosen problem', () {
    final message = buildOrderSupportMessage(
      orderNumber: 'TK-15',
      kitchenName: 'مطبخ هدى',
      problemLabel: 'الأكل وصل بارد',
    );
    expect(message, contains('TK-15'));
    expect(message, contains('مطبخ هدى'));
    expect(message, contains('الأكل وصل بارد'));
    expect(message.contains('تفاصيل'), isFalse);

    final uri = supportWhatsappUri(
      defaultSupportWhatsappNumber,
      buildOrderSupportMessage(
        orderNumber: 'TK-15',
        kitchenName: 'مطبخ هدى',
        problemLabel: 'ناقص صنف',
        note: 'الرز',
      ),
    );
    expect(uri.host, 'wa.me');
    expect(uri.path, '/201515327198');
    expect(uri.queryParameters['text'], contains('الرز'));
  });

  test('reorder replaces another kitchen only after the cart is rebuilt', () {
    final cart = CartStore.instance;
    cart.clear();
    cart.addItem(
      kitchenId: 'other',
      kitchenName: 'مطبخ تاني',
      item: const CartItem(
        id: 'a',
        menuItemId: 'm1',
        menuItemName: 'طاجن',
        menuItemSizeId: null,
        sizeName: null,
        unitPrice: 10,
        depositAmount: 2,
        quantity: 1,
        customerNote: null,
      ),
    );
    expect(
      () => cart.addItem(
        kitchenId: 'hoda',
        kitchenName: 'مطبخ هدى',
        item: const CartItem(
          id: 'b',
          menuItemId: 'm2',
          menuItemName: 'كشري',
          menuItemSizeId: 'large',
          sizeName: 'كبير',
          unitPrice: 55,
          depositAmount: 10,
          quantity: 2,
          customerNote: 'من غير بصل',
        ),
      ),
      throwsStateError,
    );

    cart.replaceWith(
      kitchenId: 'hoda',
      kitchenName: 'مطبخ هدى',
      items: const [
        CartItem(
          id: 'b',
          menuItemId: 'm2',
          menuItemName: 'كشري',
          menuItemSizeId: 'large',
          sizeName: 'كبير',
          unitPrice: 55,
          depositAmount: 10,
          quantity: 2,
          customerNote: 'من غير بصل',
        ),
      ],
    );

    expect(cart.kitchenId, 'hoda');
    expect(cart.items, hasLength(1));
    expect(cart.items.single.quantity, 2);
    expect(cart.items.single.customerNote, 'من غير بصل');
    expect(cart.items.single.unitPrice, 55);
    cart.clear();
  });

  test('history groups newest first across completed and cancelled orders', () {
    final now = DateTime(2026, 11, 16, 18);
    final groups = groupOrdersNewestFirst(
      [
        (id: 'old', at: DateTime(2026, 11, 10, 12)),
        (id: 'today-late', at: DateTime(2026, 11, 16, 17)),
        (id: 'today-early', at: DateTime(2026, 11, 16, 9)),
        (id: 'yesterday', at: DateTime(2026, 11, 15, 11)),
      ],
      createdAt: (order) => order.at,
      now: now,
    );
    expect(
      groups.map((group) => group.label).toList(),
      ['اليوم', 'أمس', '10 نوفمبر 2026'],
    );
    expect(groups.first.orders.map((order) => order.id), [
      'today-late',
      'today-early',
    ]);
  });
}
