import 'package:flutter/material.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/orders/customer_order_status.dart';
import '../../../core/orders/order_status.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../../cart/data/order_service.dart';
import '../../home/presentation/kitchen_details_screen.dart';
import '../data/order_history_groups.dart';
import 'order_tracking_screen.dart';
import 'reorder_flow.dart';

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
  static const _pageSize = 20;

  final _orderService = const OrderService();
  final _scrollController = ScrollController();

  final List<CustomerOrderSummary> _orders = [];
  String? _nextCursor;
  var _hasMore = false;
  var _initialLoading = true;
  var _loadingMore = false;
  var _refreshing = false;
  Object? _error;
  var _showActive = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadInitial();
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _initialLoading || _error != null) {
      return;
    }
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  Future<void> _loadInitial() async {
    setState(() {
      _initialLoading = true;
      _error = null;
    });
    try {
      final jwt = await requireSessionJwt(context);
      final page = await _orderService.loadMyOrders(
        sessionToken: jwt,
        limit: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _orders
          ..clear()
          ..addAll(page.orders);
        _nextCursor = page.nextCursor;
        _hasMore = page.hasMore;
        _initialLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _initialLoading = false;
      });
    }
  }

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      final jwt = await requireSessionJwt(context);
      final page = await _orderService.loadMyOrders(
        sessionToken: jwt,
        limit: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _orders
          ..clear()
          ..addAll(page.orders);
        _nextCursor = page.nextCursor;
        _hasMore = page.hasMore;
        _error = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _loadMore() async {
    if (!_hasMore || _loadingMore || _nextCursor == null) return;
    setState(() => _loadingMore = true);
    try {
      final jwt = await requireSessionJwt(context);
      final page = await _orderService.loadMyOrders(
        sessionToken: jwt,
        cursor: _nextCursor,
        limit: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _mergeOrders(page.orders);
        _nextCursor = page.nextCursor;
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  void _mergeOrders(List<CustomerOrderSummary> incoming) {
    final seen = {for (final order in _orders) order.id};
    for (final order in incoming) {
      if (seen.add(order.id)) {
        _orders.add(order);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final Widget body;
    if (_initialLoading) {
      body = const ListScreenSkeleton(titleWidth: 110);
    } else if (_error != null && _orders.isEmpty) {
      body = Center(
        child: TakkaErrorRetry(onRetry: _loadInitial),
      );
    } else {
      final visible = _orders
          .where(
            (order) => _showActive
                ? isActiveOrderStatus(order.status)
                : isPreviousOrderStatus(order.status),
          )
          .toList();
      final groups = groupOrdersNewestFirst(
        visible,
        createdAt: (order) => order.createdAt,
      );

      body = Column(
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
              onRefresh: _refresh,
              child: visible.isEmpty
                  ? ListView(
                      controller: _scrollController,
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
                  : ListView(
                      controller: _scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                      children: [
                        for (final group in groups) ...[
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8, top: 8),
                            child: Text(
                              group.label,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: TakkaColors.muted,
                              ),
                            ),
                          ),
                          for (final order in group.orders) ...[
                            _OrderCard(order: order, dayLabel: group.label),
                            const SizedBox(height: 12),
                          ],
                        ],
                        if (_loadingMore)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
          ),
        ],
      );
    }

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
  const _OrderCard({
    required this.order,
    required this.dayLabel,
  });

  final CustomerOrderSummary order;
  final String dayLabel;

  @override
  Widget build(BuildContext context) {
    final statusLabel = customerOrderStatusLabel(
      order.status,
      deliveryType: order.deliveryType,
    );
    final previous = isPreviousOrderStatus(order.status);
    final when = order.createdAt;
    final clock = when == null ? '' : formatOrderClock(when);
    final kitchenTarget = order.kitchenSlug.isNotEmpty
        ? order.kitchenSlug
        : order.kitchenId;

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
                    if (clock.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        '$dayLabel · $clock',
                        style: const TextStyle(
                          color: TakkaColors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
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
                  statusLabel,
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
          if (kitchenTarget.isNotEmpty)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => KitchenDetailsScreen(
                        kitchenIdOrSlug: kitchenTarget,
                        title: order.kitchenName,
                      ),
                    ),
                  );
                },
                child: const Text('من نفس المطبخ'),
              ),
            ),
          if (previous) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => startReorder(context, order.id),
                child: const Text('اطلب تاني'),
              ),
            ),
          ],
          if (order.status == 'COMPLETED' && !order.hasReview) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => OrderTrackingScreen(orderId: order.id),
                    ),
                  );
                },
                child: const Text('قيّم تجربتك'),
              ),
            ),
          ],
          const SizedBox(height: 8),
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
              child: Text(previous ? 'تفاصيل الطلب' : 'تتبع الطلب'),
            ),
          ),
        ],
      ),
    );
  }
}
