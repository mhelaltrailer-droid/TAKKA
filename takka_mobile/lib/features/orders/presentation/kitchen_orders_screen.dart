import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';

import '../../../core/kitchen/kitchen_feature_gate.dart';
import '../../../core/links/external_link.dart';
import '../../../core/location/maps_links.dart';
import '../../../core/network/mobile_upload_service.dart';
import '../../../core/realtime/pusher_realtime_service.dart';
import '../../../core/ui/friendly_error.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../../auth/data/mobile_me_service.dart';
import '../../cart/data/order_service.dart';
import '../../kitchen_management/data/kitchen_management_service.dart';

class KitchenOrdersScreen extends StatefulWidget {
  const KitchenOrdersScreen({super.key});

  @override
  State<KitchenOrdersScreen> createState() => _KitchenOrdersScreenState();
}

class _KitchenOrdersScreenState extends State<KitchenOrdersScreen> {
  static const _pageSize = 20;

  final _orderService = const OrderService();
  final _kitchenService = const KitchenManagementService();
  final _meService = const MobileMeService();
  final _uploadService = MobileUploadService();
  final _scrollController = ScrollController();

  KitchenFeatureAccess? _access;
  final List<KitchenOrderSummary> _orders = [];
  String? _nextCursor;
  var _hasMore = false;
  var _initialLoading = true;
  var _loadingMore = false;
  Object? _error;
  String? _userChannelName;

  void _onRealtimeEvent(PusherEvent event) {
    if (!mounted) return;
    // Reset to first page so new active orders land at the top.
    _loadInitial(quiet: true);
  }

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadInitial();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    final channelName = _userChannelName;
    if (channelName != null) {
      PusherRealtimeService.instance.unsubscribe(
        channelName,
        onEvent: _onRealtimeEvent,
      );
    }
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

  Future<void> _subscribeRealtime() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final appUserId = await _meService.loadAppUserId(sessionToken: token.jwt);
      final channelName = 'user-$appUserId';
      _userChannelName = channelName;
      await PusherRealtimeService.instance.subscribe(
        channelName: channelName,
        onEvent: _onRealtimeEvent,
      );
    } catch (_) {}
  }

  Future<void> _loadInitial({bool quiet = false}) async {
    if (!quiet) {
      setState(() {
        _initialLoading = true;
        _error = null;
      });
    }
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await _kitchenService.loadProfile(sessionToken: token.jwt);
      final access = kitchenFeatureAccessFromStatus(profile?.approvalStatus);
      if (access != KitchenFeatureAccess.ready) {
        if (!mounted) return;
        setState(() {
          _access = access;
          _orders.clear();
          _nextCursor = null;
          _hasMore = false;
          _initialLoading = false;
          _error = null;
        });
        return;
      }

      final page = await _orderService.loadKitchenOrders(
        sessionToken: token.jwt,
        limit: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _access = KitchenFeatureAccess.ready;
        _orders
          ..clear()
          ..addAll(page.orders);
        _nextCursor = page.nextCursor;
        _hasMore = page.hasMore;
        _initialLoading = false;
        _error = null;
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
    await _loadInitial(quiet: true);
  }

  Future<void> _loadMore() async {
    if (!_hasMore || _loadingMore || _nextCursor == null) return;
    setState(() => _loadingMore = true);
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final page = await _orderService.loadKitchenOrders(
        sessionToken: token.jwt,
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

  void _mergeOrders(List<KitchenOrderSummary> incoming) {
    final seen = {for (final order in _orders) order.id};
    for (final order in incoming) {
      if (seen.add(order.id)) {
        _orders.add(order);
      }
    }
  }

  Future<void> _reloadAfterAction() => _loadInitial(quiet: true);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('طلبات المطبخ')),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_initialLoading) {
      return const ListScreenSkeleton(titleWidth: 140);
    }

    if (_error != null && _orders.isEmpty && _access == null) {
      return Center(
        child: TakkaErrorRetry(onRetry: _loadInitial),
      );
    }

    final access = _access;
    if (access != null && access != KitchenFeatureAccess.ready) {
      return KitchenFeatureGate(access: access);
    }

    if (_orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: const [
            SizedBox(height: 180),
            Center(
              child: Text(
                'لا توجد طلبات للمطبخ بعد.',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        itemCount: _orders.length + (_loadingMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= _orders.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            );
          }
          final order = _orders[index];
          return Card(
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
                  Text(
                    order.customerPhone.isNotEmpty
                        ? 'هاتف التسجيل: ${order.customerPhone}'
                        : 'هاتف التسجيل: غير متوفر',
                  ),
                  if (order.customerContactPhone != null &&
                      order.customerContactPhone!.isNotEmpty)
                    Text(
                      'هاتف تواصل آخر: ${order.customerContactPhone}',
                    ),
                  if (order.addressLine != null)
                    Text('العنوان: ${order.addressLine}'),
                  if (order.deliveryType == 'DELIVERY' &&
                      order.deliveryLatitude != null &&
                      order.deliveryLongitude != null) ...[
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: () async {
                        final url = googleMapsShareUrl(
                          order.deliveryLatitude!,
                          order.deliveryLongitude!,
                        );
                        await Clipboard.setData(ClipboardData(text: url));
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'تم نسخ رابط موقع العميل (Google Maps)',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy_all_outlined),
                      label: const Text('نسخ عنوان الخريطة'),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFE11D48),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              openExternalLink(
                                context,
                                Uri.parse(
                                  googleMapsShareUrl(
                                    order.deliveryLatitude!,
                                    order.deliveryLongitude!,
                                  ),
                                ),
                                failureMessage: mapsLinkFailureMessage,
                              );
                            },
                            icon: const Icon(Icons.map_outlined),
                            label: const Text('عرض على الخريطة'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final text =
                                  order.addressLine?.trim().isNotEmpty == true
                                  ? order.addressLine!
                                  : formatCoords(
                                      order.deliveryLatitude!,
                                      order.deliveryLongitude!,
                                    );
                              await Clipboard.setData(
                                ClipboardData(text: text),
                              );
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('تم نسخ العنوان'),
                                ),
                              );
                            },
                            icon: const Icon(Icons.copy_outlined),
                            label: const Text('نسخ العنوان'),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (order.customerNotes != null &&
                      order.customerNotes!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF8E1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'ملاحظات العميل: ${order.customerNotes}',
                        style: const TextStyle(height: 1.45),
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  ...order.items.map(
                    (item) => Text(
                      '${item.itemName}${item.sizeName != null ? ' - ${item.sizeName}' : ''} × ${item.quantity}'
                      '${item.customerNote != null && item.customerNote!.isNotEmpty ? '\n  ملاحظة: ${item.customerNote}' : ''}',
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
          );
        },
      ),
    );
  }

  List<Widget> _buildActions(KitchenOrderSummary order) {
    final authState = ClerkAuth.of(context, listen: false);
    final actions = <Widget>[];

    if (_canChat(order.status)) {
      actions.add(
        OutlinedButton.icon(
          onPressed: () => _openChat(order),
          icon: const Icon(Icons.chat_bubble_outline),
          label: const Text('تواصل'),
        ),
      );
    } else if (_canViewChatHistory(order.status)) {
      actions.add(
        OutlinedButton.icon(
          onPressed: () => _openChat(order, readOnly: true),
          icon: const Icon(Icons.forum_outlined),
          label: const Text('سجل المحادثة'),
        ),
      );
    }

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
              await _reloadAfterAction();
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
              final reason = await _askRejectReason(context);
              if (reason == null || !mounted) {
                return;
              }
              final token = await authState.sessionToken();
              await _orderService.rejectKitchenOrder(
                sessionToken: token.jwt,
                orderId: order.id,
                reason: reason,
              );
              await _reloadAfterAction();
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
              await _reloadAfterAction();
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
              await _reloadAfterAction();
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
                await _reloadAfterAction();
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

  Future<String?> _askRejectReason(BuildContext context) async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('رفض الطلب'),
          content: TextField(
            controller: controller,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'سبب الرفض (اختياري)',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('رجوع'),
            ),
            FilledButton(
              onPressed: () =>
                  Navigator.of(dialogContext).pop(controller.text.trim()),
              child: const Text('رفض الطلب'),
            ),
          ],
        );
      },
    );
    controller.dispose();
    return result;
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
              hintText: 'رسوم التوصيل (يمكن 0)',
              helperText: 'انسخ موقع العميل أولاً ثم أدخل الرسوم',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('رجوع'),
            ),
            FilledButton(
              onPressed: () {
                final raw = controller.text.trim();
                Navigator.of(
                  context,
                ).pop(raw.isEmpty ? 0.0 : double.tryParse(raw));
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

  bool _canChat(String status) {
    return status != 'PENDING_KITCHEN_APPROVAL' &&
        status != 'REJECTED_BY_KITCHEN' &&
        status != 'COMPLETED' &&
        status != 'CANCELLED_BEFORE_DEPOSIT' &&
        status != 'CANCELLED_AFTER_DEPOSIT';
  }

  bool _canViewChatHistory(String status) {
    return status != 'PENDING_KITCHEN_APPROVAL' &&
        status != 'REJECTED_BY_KITCHEN';
  }

  Future<void> _openChat(
    KitchenOrderSummary order, {
    bool readOnly = false,
  }) async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    List<OrderMessageInfo> messages = const [];
    try {
      messages = await _orderService.loadOrderMessages(
        sessionToken: token.jwt,
        orderId: order.id,
      );
    } catch (error) {
      if (!mounted) return;
      _showError(error);
      return;
    }

    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        return _KitchenChatSheet(
          order: order,
          initialMessages: messages,
          readOnly: readOnly,
          orderService: _orderService,
          uploadService: _uploadService,
        );
      },
    );
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
    showFriendlyError(context, error: error);
  }
}

class _KitchenStatusChip extends StatelessWidget {
  const _KitchenStatusChip({required this.status});

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

class _KitchenChatSheet extends StatefulWidget {
  const _KitchenChatSheet({
    required this.order,
    required this.initialMessages,
    required this.readOnly,
    required this.orderService,
    required this.uploadService,
  });

  final KitchenOrderSummary order;
  final List<OrderMessageInfo> initialMessages;
  final bool readOnly;
  final OrderService orderService;
  final MobileUploadService uploadService;

  @override
  State<_KitchenChatSheet> createState() => _KitchenChatSheetState();
}

class _KitchenChatSheetState extends State<_KitchenChatSheet> {
  late List<OrderMessageInfo> _messages;
  final _controller = TextEditingController();
  var _sending = false;

  @override
  void initState() {
    super.initState();
    _messages = List.of(widget.initialMessages);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    final next = await widget.orderService.loadOrderMessages(
      sessionToken: token.jwt,
      orderId: widget.order.id,
    );
    if (!mounted) return;
    setState(() => _messages = next);
  }

  Future<void> _sendText() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await widget.orderService.sendOrderMessage(
        sessionToken: token.jwt,
        orderId: widget.order.id,
        text: text,
      );
      _controller.clear();
      await _reload();
    } catch (error) {
      if (!mounted) return;
      showFriendlyError(context, error: error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _sendImage() async {
    if (_sending) return;
    setState(() => _sending = true);
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await widget.uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
        purpose: 'chatImage',
      );
      if (url == null) return;
      await widget.orderService.sendOrderMessage(
        sessionToken: token.jwt,
        orderId: widget.order.id,
        imageUrl: url,
      );
      await _reload();
    } catch (error) {
      if (!mounted) return;
      showFriendlyError(context, error: error);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.75,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'تواصل — ${widget.order.orderNumber}',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: _messages.isEmpty
                    ? [const Text('لا توجد رسائل بعد.')]
                    : _messages
                          .map(
                            (message) => Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    message.senderName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  if (message.messageText != null &&
                                      message.messageText!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(message.messageText!),
                                    ),
                                  if (message.fileUrl != null &&
                                      message.fileUrl!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(10),
                                        child: Image.network(
                                          message.fileUrl!,
                                          height: 160,
                                          width: double.infinity,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => Text(
                                            message.fileUrl!,
                                            style: const TextStyle(
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          )
                          .toList(),
              ),
            ),
            if (widget.readOnly)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'المحادثة مغلقة بعد اكتمال الطلب. السجل للعرض فقط.',
                  textAlign: TextAlign.center,
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        enabled: !_sending,
                        decoration: const InputDecoration(
                          hintText: 'اكتب رسالة للعميل',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filledTonal(
                      onPressed: _sending ? null : _sendImage,
                      icon: const Icon(Icons.image_outlined),
                      tooltip: 'إرسال صورة',
                    ),
                    const SizedBox(width: 4),
                    FilledButton(
                      onPressed: _sending ? null : _sendText,
                      child: Text(_sending ? '...' : 'إرسال'),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
