import 'package:flutter/material.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/links/external_link.dart';
import '../../../core/support/support_whatsapp.dart';
import '../../../core/ui/friendly_error.dart';
import '../../cart/data/order_service.dart';

Future<void> openOrderSupportSheet(
  BuildContext context, {
  required String orderId,
  required String orderNumber,
  required String kitchenName,
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) {
      return _OrderSupportSheet(
        orderId: orderId,
        orderNumber: orderNumber,
        kitchenName: kitchenName,
      );
    },
  );
}

class _OrderSupportSheet extends StatefulWidget {
  const _OrderSupportSheet({
    required this.orderId,
    required this.orderNumber,
    required this.kitchenName,
  });

  final String orderId;
  final String orderNumber;
  final String kitchenName;

  @override
  State<_OrderSupportSheet> createState() => _OrderSupportSheetState();
}

class _OrderSupportSheetState extends State<_OrderSupportSheet> {
  final _noteController = TextEditingController();
  final _orders = const OrderService();
  final _support = const SupportWhatsappClient();
  String _type = orderIssueOptions.first.$1;
  var _busy = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      final jwt = await requireSessionJwt(context);
      if (!mounted) return;
      await _orders.logOrderIssue(
        sessionToken: jwt,
        orderId: widget.orderId,
        type: _type,
        note: _noteController.text,
      );
      final number = await _support.fetchNumber();
      if (!mounted) return;
      final label = orderIssueOptions
          .firstWhere((option) => option.$1 == _type)
          .$2;
      final uri = supportWhatsappUri(
        number,
        buildOrderSupportMessage(
          orderNumber: widget.orderNumber,
          kitchenName: widget.kitchenName,
          problemLabel: label,
          note: _noteController.text,
        ),
      );
      final opened = await openExternalLink(
        context,
        uri,
        failureMessage: whatsAppLinkFailureMessage,
      );
      if (opened && mounted) {
        Navigator.of(context).pop();
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyErrorMessage(error))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, 20 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'عندي مشكلة في الطلب',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          const Text(
            'اختار نوع المشكلة. هنتسجلها عند تكة ونفتح واتساب برسالة فيها رقم الطلب واسم المطبخ.',
          ),
          const SizedBox(height: 12),
          RadioGroup<String>(
            groupValue: _type,
            onChanged: (value) {
              if (_busy || value == null) return;
              setState(() => _type = value);
            },
            child: Column(
              children: [
                for (final option in orderIssueOptions)
                  RadioListTile<String>(
                    value: option.$1,
                    contentPadding: EdgeInsets.zero,
                    title: Text(option.$2),
                  ),
              ],
            ),
          ),
          TextField(
            controller: _noteController,
            maxLines: 3,
            enabled: !_busy,
            decoration: const InputDecoration(
              hintText: 'تفاصيل (اختياري)',
            ),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'جارٍ التسجيل...' : 'افتح واتساب'),
          ),
        ],
      ),
    );
  }
}
