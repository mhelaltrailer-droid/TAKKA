import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/orders/order_status.dart';
import '../../../core/theme/app_theme.dart';
import '../../cart/data/order_service.dart';
import 'order_tracking_screen.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({
    super.key,
    this.embeddedInShell = false,
  });

  final bool embeddedInShell;

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  final _orderService = const OrderService();
  Future<List<CustomerOrderSummary>>? _ordersFuture;
  var _showActive = true;

  @override
  void initState() {
    super.initState();
    _ordersFuture = _loadOrders();
  }

  Future<List<CustomerOrderSummary>> _loadOrders() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _orderService.loadMyOrders(sessionToken: token.jwt);
  }

  @override
  Widget build(BuildContext context) {
    final body = FutureBuilder<List<CustomerOrderSummary>>(
      future: _ordersFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _OrdersErrorState(
            message: snapshot.error.toString(),
            onRetry: () {
              setState(() {
                _ordersFuture = _loadOrders();
              });
            },
          );
        }

        final all = snapshot.data ?? const [];
        final orders = all
            .where(
              (order) => _showActive
                  ? isActiveOrderStatus(order.status)
                  : isPreviousOrderStatus(order.status),
            )
            .toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Text(
                widget.embeddedInShell ? 'طلباتك' : 'طلباتي',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _OrdersTabBar(
                showActive: _showActive,
                onChanged: (active) => setState(() => _showActive = active),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  final future = _loadOrders();
                  setState(() => _ordersFuture = future);
                  await future;
                },
                child: orders.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          SizedBox(
                            height: MediaQuery.sizeOf(context).height * 0.35,
                            child: Center(
                              child: Text(
                                _showActive
                                    ? 'لا توجد طلبات نشطة حالياً'
                                    : 'لا توجد طلبات سابقة',
                                style: const TextStyle(
                                  color: TakkaColors.muted,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                        itemCount: orders.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          return _OrderCard(order: orders[index]);
                        },
                      ),
              ),
            ),
          ],
        );
      },
    );

    if (widget.embeddedInShell) {
      return Scaffold(
        body: SafeArea(child: body),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('طلباتي'),
      ),
      body: body,
    );
  }
}

class _OrdersTabBar extends StatelessWidget {
  const _OrdersTabBar({
    required this.showActive,
    required this.onChanged,
  });

  final bool showActive;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F2F2),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: _TabChip(
              label: 'النشطة',
              selected: showActive,
              onTap: () => onChanged(true),
            ),
          ),
          Expanded(
            child: _TabChip(
              label: 'السابقة',
              selected: !showActive,
              onTap: () => onChanged(false),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? Colors.white : Colors.transparent,
      elevation: selected ? 1.5 : 0,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              color: selected ? TakkaColors.ink : TakkaColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final CustomerOrderSummary order;

  @override
  Widget build(BuildContext context) {
    final statusLabel = orderStatusLabelAr(order.status);
    final isCancelled = order.status.startsWith('CANCELLED') ||
        order.status == 'REJECTED_BY_KITCHEN';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: TakkaColors.softLine),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F0EA),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.restaurant_rounded,
                  color: TakkaColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.kitchenName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'طلب رقم ${order.orderNumber}',
                      style: const TextStyle(
                        color: TakkaColors.muted,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F2F2),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  isCancelled ? 'تم الإلغاء' : statusLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Text(
                  order.deliveryType == 'DELIVERY' ? 'توصيل' : 'استلام',
                  style: const TextStyle(color: TakkaColors.muted),
                ),
              ),
              Text(
                '${order.totalAmount.toStringAsFixed(0)} ج.م',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => OrderTrackingScreen(orderId: order.id),
                  ),
                );
              },
              child: const Text('تتبع الطلب'),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrdersErrorState extends StatelessWidget {
  const _OrdersErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.receipt_long_outlined, size: 42),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onRetry,
              child: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}
