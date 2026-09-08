import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/realtime/pusher_realtime_service.dart';
import '../../auth/data/mobile_me_service.dart';
import '../../cart/data/order_service.dart';

class KitchenOrdersScreen extends StatefulWidget {
  const KitchenOrdersScreen({super.key});

  @override
  State<KitchenOrdersScreen> createState() => _KitchenOrdersScreenState();
}

class _KitchenOrdersScreenState extends State<KitchenOrdersScreen> {
  final _orderService = const OrderService();
  final _meService = const MobileMeService();
  Future<List<KitchenOrderSummary>>? _future;
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

  Future<List<KitchenOrderSummary>> _load() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _orderService.loadKitchenOrders(sessionToken: token.jwt);
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
          if (!mounted) {
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
        title: const Text('طلبات المطبخ'),
      ),
      body: FutureBuilder<List<KitchenOrderSummary>>(
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

          final orders = snapshot.data ?? const [];
          if (orders.isEmpty) {
            return const Center(
              child: Text(
                'لا توجد طلبات للمطبخ بعد.',
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
              children: orders
                  .map(
                    (order) => Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    order.orderNumber,
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                _KitchenStatusChip(status: order.status),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text('العميل: ${order.customerName}'),
                            if (order.customerContact.isNotEmpty)
                              Text('التواصل: ${order.customerContact}'),
                            if (order.addressLine != null)
                              Text('العنوان: ${order.addressLine}'),
                            const SizedBox(height: 10),
                            ...order.items.map(
                              (item) => Text(
                                '${item.itemName}${item.sizeName != null ? ' - ${item.sizeName}' : ''} × ${item.quantity}',
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'الإجمالي: ${order.totalAmount.toStringAsFixed(0)} ج.م',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            if (order.latestDepositProof != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                'إثبات العربون: ${order.latestDepositProof!.imageUrl}',
                              ),
                              if (order.latestDepositProof!.reviewStatus.isNotEmpty)
                                Text(
                                  'حالة المراجعة: ${order.latestDepositProof!.reviewStatus}',
                                ),
                            ],
                            const SizedBox(height: 14),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _buildActions(order),
                            ),
                          ],
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

  List<Widget> _buildActions(KitchenOrderSummary order) {
    final authState = ClerkAuth.of(context, listen: false);
    final actions = <Widget>[];

    if (order.status == 'PENDING_KITCHEN_APPROVAL') {
      actions.add(
        FilledButton(
          onPressed: () async {
            try {
              final deliveryFee = order.deliveryType == 'DELIVERY'
                  ? await _askDeliveryFee(context)
                  : 0.0;

              if (deliveryFee == null) {
                return;
              }

              if (!mounted) {
                return;
              }

              final token = await authState.sessionToken();

              await _orderService.acceptKitchenOrder(
                sessionToken: token.jwt,
                orderId: order.id,
                deliveryFee: deliveryFee,
              );
              setState(() => _future = _load());
            } catch (error) {
              _showError(error);
            }
          },
          child: const Text('قبول'),
        ),
      );

      actions.add(
        OutlinedButton(
          onPressed: () async {
            try {
              final token = await authState.sessionToken();
              await _orderService.rejectKitchenOrder(
                sessionToken: token.jwt,
                orderId: order.id,
              );
              setState(() => _future = _load());
            } catch (error) {
              _showError(error);
            }
          },
          child: const Text('رفض'),
        ),
      );
    } else if (order.status == 'DEPOSIT_PROOF_SUBMITTED') {
      actions.add(
        FilledButton(
          onPressed: () async {
            try {
              final token = await authState.sessionToken();
              await _orderService.approveDepositProof(
                sessionToken: token.jwt,
                orderId: order.id,
              );
              setState(() => _future = _load());
            } catch (error) {
              _showError(error);
            }
          },
          child: const Text('تأكيد العربون'),
        ),
      );

      actions.add(
        OutlinedButton(
          onPressed: () async {
            try {
              final token = await authState.sessionToken();
              await _orderService.rejectDepositProof(
                sessionToken: token.jwt,
                orderId: order.id,
              );
              setState(() => _future = _load());
            } catch (error) {
              _showError(error);
            }
          },
          child: const Text('رفض الإثبات'),
        ),
      );
    } else {
      for (final nextStatus in _allowedNextStatuses(order)) {
        actions.add(
          OutlinedButton(
            onPressed: () async {
              try {
                final token = await authState.sessionToken();
                await _orderService.updateKitchenOrderStatus(
                  sessionToken: token.jwt,
                  orderId: order.id,
                  nextStatus: nextStatus,
                );
                setState(() => _future = _load());
              } catch (error) {
                _showError(error);
              }
            },
            child: Text(_labelForStatus(nextStatus)),
          ),
        );
      }
    }

    return actions;
  }

  Future<double?> _askDeliveryFee(BuildContext context) async {
    final controller = TextEditingController();

    final result = await showDialog<double>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('رسوم التوصيل'),
          content: TextField(
            controller: controller,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              hintText: 'أدخل رسوم التوصيل',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('إلغاء'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(context).pop(double.tryParse(controller.text.trim()));
              },
              child: const Text('تأكيد'),
            ),
          ],
        );
      },
    );

    controller.dispose();
    return result;
  }

  List<String> _allowedNextStatuses(KitchenOrderSummary order) {
    switch (order.status) {
      case 'DEPOSIT_CONFIRMED':
        return ['PREPARING'];
      case 'PREPARING':
        return order.deliveryType == 'DELIVERY'
            ? ['OUT_FOR_DELIVERY']
            : ['READY_FOR_PICKUP'];
      case 'READY_FOR_PICKUP':
        return ['AWAITING_CUSTOMER_ARRIVAL'];
      case 'AWAITING_CUSTOMER_ARRIVAL':
      case 'OUT_FOR_DELIVERY':
        return ['DELIVERED_BY_KITCHEN_OR_DRIVER'];
      case 'DELIVERED_BY_KITCHEN_OR_DRIVER':
        return ['COMPLETED_AWAITING_CUSTOMER_CONFIRM'];
      default:
        return [];
    }
  }

  String _labelForStatus(String status) {
    switch (status) {
      case 'PREPARING':
        return 'بدء التحضير';
      case 'READY_FOR_PICKUP':
        return 'جاهز للاستلام';
      case 'AWAITING_CUSTOMER_ARRIVAL':
        return 'بانتظار وصول العميل';
      case 'OUT_FOR_DELIVERY':
        return 'خرج للتوصيل';
      case 'DELIVERED_BY_KITCHEN_OR_DRIVER':
        return 'تم التسليم';
      case 'COMPLETED_AWAITING_CUSTOMER_CONFIRM':
        return 'بانتظار تأكيد العميل';
      default:
        return status;
    }
  }

  void _showError(Object error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error.toString()),
      ),
    );
  }
}

class _KitchenStatusChip extends StatelessWidget {
  const _KitchenStatusChip({
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}
