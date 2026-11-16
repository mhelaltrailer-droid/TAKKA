import 'package:flutter/material.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/ui/friendly_error.dart';
import '../../cart/data/cart_store.dart';
import '../../cart/data/order_service.dart';
import '../../cart/presentation/cart_screen.dart';

Future<void> startReorder(BuildContext context, String orderId) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    final jwt = await requireSessionJwt(context);
    if (!context.mounted) return;
    final preview = await const OrderService().loadReorderPreview(
      sessionToken: jwt,
      orderId: orderId,
    );
    if (!context.mounted) return;

    if (!preview.kitchenAvailable || preview.kitchen == null) {
      await _notice(
        context,
        title: 'مقدرناش نكرر الطلب',
        body: preview.message ??
            'المطبخ مش متاح دلوقتي. جرّب تاني لما يفتح.',
      );
      return;
    }

    if (preview.items.isEmpty) {
      await _notice(
        context,
        title: 'مفيش أصناف متاحة',
        body: [
          preview.message,
          ...preview.notices,
        ].whereType<String>().where((line) => line.trim().isNotEmpty).join('\n'),
      );
      return;
    }

    final cart = CartStore.instance;
    final kitchen = preview.kitchen!;
    if (cart.items.isNotEmpty &&
        cart.kitchenId != null &&
        cart.kitchenId != kitchen.id) {
      final replace = await showDialog<bool>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('السلة فيها مطبخ تاني'),
            content: const Text(
              'السلة فيها أصناف من مطبخ تاني. لو كملت هنستبدلها بأصناف الطلب ده.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('إلغاء'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('استبدال السلة'),
              ),
            ],
          );
        },
      );
      if (replace != true || !context.mounted) return;
    }

    cart.replaceWith(
      kitchenId: kitchen.id,
      kitchenName: kitchen.kitchenName,
      kitchenLatitude: kitchen.latitude,
      kitchenLongitude: kitchen.longitude,
      kitchenAddressLine: kitchen.addressLine,
      kitchenRegionLabel: kitchen.regionLabel,
      items: [
        for (var index = 0; index < preview.items.length; index++)
          CartItem(
            id: '${preview.items[index].menuItemId}-${preview.items[index].menuItemSizeId ?? 'base'}-$index',
            menuItemId: preview.items[index].menuItemId,
            menuItemName: preview.items[index].menuItemName,
            menuItemSizeId: preview.items[index].menuItemSizeId,
            sizeName: preview.items[index].sizeName,
            unitPrice: preview.items[index].unitPrice,
            depositAmount: preview.items[index].depositAmount,
            quantity: preview.items[index].quantity,
            customerNote: preview.items[index].customerNote,
          ),
      ],
    );

    if (!context.mounted) return;
    final body = preview.notices.isEmpty
        ? 'رجّعنا الأصناف للسلة بنفس الكميات والملاحظات، وبالأسعار الحالية.'
        : '${preview.notices.join('\n')}\nالأسعار الحالية اتحطت في السلة.';
    await _notice(
      context,
      title: 'تم تجهيز الطلب تاني',
      body: body,
      confirmLabel: 'روح للسلة',
    );
    if (!context.mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const CartScreen()),
    );
  } catch (error) {
    messenger.showSnackBar(
      SnackBar(content: Text(friendlyErrorMessage(error))),
    );
  }
}

Future<void> _notice(
  BuildContext context, {
  required String title,
  required String body,
  String confirmLabel = 'تمام',
}) {
  return showDialog<void>(
    context: context,
    builder: (context) {
      return AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(confirmLabel),
          ),
        ],
      );
    },
  );
}
