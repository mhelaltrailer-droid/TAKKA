import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/session_token.dart';
import '../../../core/network/mobile_upload_service.dart';
import '../../../core/orders/customer_order_status.dart';
import '../../../core/realtime/pusher_realtime_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/ui/takka_error_retry.dart';
import '../../../core/ui/takka_skeletons.dart';
import '../../../core/validation/phone.dart';
import '../../cart/data/order_service.dart';

class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({
    super.key,
    required this.orderId,
  });

  final String orderId;

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  final _orderService = const OrderService();
  final _uploadService = MobileUploadService();
  final _depositUrlController = TextEditingController();
  final _depositAmountController = TextEditingController();
  final _chatTextController = TextEditingController();
  final _reviewCommentController = TextEditingController();
  Future<CustomerOrderDetails>? _future;
  int _selectedRating = 0;
  var _submittingReview = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
    PusherRealtimeService.instance.subscribe(
      channelName: 'order-${widget.orderId}',
      onEvent: (event) {
        if (!mounted) {
          return;
        }
        setState(() => _future = _load());
      },
    );
  }

  @override
  void dispose() {
    PusherRealtimeService.instance.unsubscribe('order-${widget.orderId}');
    _depositUrlController.dispose();
    _depositAmountController.dispose();
    _chatTextController.dispose();
    _reviewCommentController.dispose();
    super.dispose();
  }

  Future<CustomerOrderDetails> _load() async {
    final jwt = await requireSessionJwt(context);
    return _orderService.loadOrderDetails(
      sessionToken: jwt,
      orderId: widget.orderId,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('متابعة الطلب'),
      ),
      body: FutureBuilder<CustomerOrderDetails>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const DetailScreenSkeleton();
          }

          if (snapshot.hasError) {
            return Center(
              child: TakkaErrorRetry(
                onRetry: () {
                  setState(() => _future = _load());
                },
              ),
            );
          }

          final order = snapshot.data!;

          return RefreshIndicator(
            onRefresh: () async {
              final future = _load();
              setState(() => _future = future);
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.orderNumber,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text('المطبخ: ${order.kitchenName}'),
                        const SizedBox(height: 6),
                        Text(
                          customerOrderStatusLabel(
                            order.status,
                            deliveryType: order.deliveryType,
                          ),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          customerOrderStatusHint(
                            order.status,
                            deliveryType: order.deliveryType,
                          ),
                          style: TextStyle(
                            color: Colors.grey.shade700,
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'طريقة الاستلام: ${order.deliveryType == 'DELIVERY' ? 'توصيل' : 'استلام'}',
                        ),
                        if (order.addressLine != null)
                          Text('العنوان: ${order.addressLine}'),
                      ],
                    ),
                  ),
                ),
                if (order.kitchenPhone != null &&
                    order.kitchenPhone!.trim().isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _KitchenContactCard(
                    kitchenName: order.kitchenName,
                    phone: order.kitchenPhone!,
                  ),
                ],
                if (order.status == 'COMPLETED') ...[
                  const SizedBox(height: 14),
                  _buildReviewSection(order),
                ],
                if (order.status == 'ACCEPTED_AWAITING_DEPOSIT' ||
                    order.status == 'DEPOSIT_PROOF_SUBMITTED') ...[
                  const SizedBox(height: 14),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'إثبات العربون',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _depositUrlController,
                            decoration: const InputDecoration(
                              hintText: 'رابط صورة إثبات العربون',
                            ),
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: _pickDepositImage,
                            icon: const Icon(Icons.photo_library_outlined),
                            label: const Text('اختيار ورفع صورة العربون'),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: _depositAmountController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              hintText: 'المبلغ المحول (اختياري)',
                            ),
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () => _submitDepositProof(order.id),
                            child: const Text('إرسال إثبات العربون'),
                          ),
                          if (order.depositProofs.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            Text(
                              'آخر حالة: ${order.depositProofs.first.reviewStatus}',
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'تسلسل الطلب',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ..._customerTimelineRows(order),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'ملخص المبالغ',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _SummaryText(
                          label: 'سعر الأصناف',
                          value: '${order.subtotalAmount.toStringAsFixed(0)} ج.م',
                        ),
                        _SummaryText(
                          label: 'رسوم التوصيل',
                          value: '${order.deliveryFee.toStringAsFixed(0)} ج.م',
                        ),
                        _SummaryText(
                          label: 'الإجمالي (طلب + توصيل)',
                          value: '${order.totalAmount.toStringAsFixed(0)} ج.م',
                        ),
                        _SummaryText(
                          label: 'العربون',
                          value: '${order.depositAmount.toStringAsFixed(0)} ج.م',
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'الأصناف',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ...order.items.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Text(
                              '${item.itemName}${item.sizeName != null ? ' - ${item.sizeName}' : ''} × ${item.quantity} | ${item.lineTotal.toStringAsFixed(0)} ج.م',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'المحادثة',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (order.messages.isEmpty)
                          const Text('لا توجد رسائل بعد.')
                        else
                          ...order.messages.map(
                            (message) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(16),
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
                                    if (message.messageText != null)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Text(message.messageText!),
                                      ),
                                    if (message.fileUrl != null)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: Image.network(
                                            message.fileUrl!,
                                            height: 180,
                                            width: double.infinity,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Text(
                                              message.fileUrl!,
                                              style: const TextStyle(fontSize: 12),
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        if (order.status == 'COMPLETED' ||
                            order.status == 'CANCELLED_BEFORE_DEPOSIT' ||
                            order.status == 'CANCELLED_AFTER_DEPOSIT') ...[
                          const SizedBox(height: 12),
                          const Text(
                            'المحادثة مغلقة بعد اكتمال الطلب. السجل متاح للعرض فقط.',
                            style: TextStyle(height: 1.4),
                          ),
                        ] else if (order.status != 'PENDING_KITCHEN_APPROVAL' &&
                            order.status != 'REJECTED_BY_KITCHEN') ...[
                          const SizedBox(height: 12),
                          TextField(
                            controller: _chatTextController,
                            maxLines: 2,
                            decoration: const InputDecoration(
                              hintText: 'اكتب رسالة للمطبخ',
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(
                                  onPressed: () => _sendChatMessage(order.id),
                                  child: const Text('إرسال رسالة'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              OutlinedButton.icon(
                                onPressed: () => _sendChatImage(order.id),
                                icon: const Icon(Icons.image_outlined),
                                label: const Text('صورة'),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (canCustomerCancelOrder(order.status)) ...[
                  const SizedBox(height: 14),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'إلغاء الطلب',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'يمكنك الإلغاء فقط قبل تأكيد المطبخ للعربون.',
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            onPressed: () => _confirmCancelOrder(
                              order.id,
                              hadDepositProofSubmitted:
                                  order.status == 'DEPOSIT_PROOF_SUBMITTED',
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red.shade700,
                              side: BorderSide(color: Colors.red.shade200),
                            ),
                            child: const Text('إلغاء الطلب'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                if (order.status == 'COMPLETED_AWAITING_CUSTOMER_CONFIRM') ...[
                  const SizedBox(height: 14),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'تأكيد الاستلام',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () => _confirmReceived(order.id),
                            child: const Text('تأكيد أنني استلمت الطلب'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildReviewSection(CustomerOrderDetails order) {
    if (order.reviewRating != null) {
      return Card(
        color: const Color(0xFFECFDF5),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'شكرًا، تم التقييم',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF065F46),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'تم تسجيل تقييمك لمطبخ ${order.kitchenName}. لن يطلب منك التقييم مرة أخرى لهذا الطلب.',
                style: const TextStyle(
                  color: Color(0xFF047857),
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                textDirection: TextDirection.ltr,
                children: List.generate(5, (index) {
                  final filled = index < (order.reviewRating ?? 0);
                  return Text(
                    '★',
                    style: TextStyle(
                      fontSize: 28,
                      color: filled
                          ? const Color(0xFFE67E22)
                          : const Color(0xFFA7F3D0),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 6),
              Text(
                '${order.reviewRating} / 5',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF065F46),
                ),
              ),
              if (order.reviewComment != null &&
                  order.reviewComment!.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  order.reviewComment!,
                  style: const TextStyle(
                    color: Color(0xFF065F46),
                    height: 1.45,
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Card(
      color: const Color(0xFFFFF8F1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0x66E67E22), width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'تقييم التجربة',
              style: TextStyle(
                color: Color(0xFFE67E22),
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'كيف كانت تجربتك مع مطبخ ${order.kitchenName}؟',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'اختر النجوم، والتعليق اختياري.',
              style: TextStyle(color: TakkaColors.muted, height: 1.45),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              textDirection: TextDirection.ltr,
              children: List.generate(5, (index) {
                final star = index + 1;
                final selected = star <= _selectedRating;
                return IconButton(
                  onPressed: _submittingReview
                      ? null
                      : () => setState(() => _selectedRating = star),
                  icon: Text(
                    '★',
                    style: TextStyle(
                      fontSize: 36,
                      color: selected
                          ? const Color(0xFFE67E22)
                          : const Color(0xFFEAD9C8),
                    ),
                  ),
                );
              }),
            ),
            if (_selectedRating > 0)
              Center(
                child: Text(
                  '$_selectedRating / 5',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            const SizedBox(height: 12),
            TextField(
              controller: _reviewCommentController,
              maxLines: 3,
              enabled: !_submittingReview,
              decoration: const InputDecoration(
                hintText: 'اكتب رأيك في الأكل أو الخدمة... (اختياري)',
              ),
            ),
            const SizedBox(height: 14),
            FilledButton(
              onPressed: _submittingReview || _selectedRating < 1
                  ? null
                  : () => _submitReview(order.id),
              child: Text(
                _submittingReview ? 'جارٍ الإرسال...' : 'إرسال',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitDepositProof(String orderId) async {
    if (_depositUrlController.text.trim().isEmpty) {
      return;
    }

    try {
      final tokenJwt = await requireSessionJwt(context);
      await _orderService.submitDepositProof(
        sessionToken: tokenJwt,
        orderId: orderId,
        imageUrl: _depositUrlController.text.trim(),
        submittedAmount: double.tryParse(_depositAmountController.text.trim()),
      );
      _depositUrlController.clear();
      _depositAmountController.clear();
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _sendChatMessage(String orderId) async {
    if (_chatTextController.text.trim().isEmpty) {
      return;
    }

    try {
      final tokenJwt = await requireSessionJwt(context);
      await _orderService.sendOrderMessage(
        sessionToken: tokenJwt,
        orderId: orderId,
        text: _chatTextController.text.trim(),
      );
      _chatTextController.clear();
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }

  void _showError(Object error) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(error.toString())),
    );
  }

  Future<void> _pickDepositImage() async {
    try {
      final tokenJwt = await requireSessionJwt(context);
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: tokenJwt,
        purpose: 'depositProofImage',
      );

      if (url != null && mounted) {
        _depositUrlController.text = url;
      }
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _sendChatImage(String orderId) async {
    try {
      final tokenJwt = await requireSessionJwt(context);
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: tokenJwt,
        purpose: 'chatImage',
      );

      if (url == null) {
        return;
      }

      await _orderService.sendOrderMessage(
        sessionToken: tokenJwt,
        orderId: orderId,
        imageUrl: url,
      );

      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _confirmReceived(String orderId) async {
    try {
      final tokenJwt = await requireSessionJwt(context);
      await _orderService.confirmReceived(
        sessionToken: tokenJwt,
        orderId: orderId,
      );
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _confirmCancelOrder(
    String orderId, {
    required bool hadDepositProofSubmitted,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('تأكيد الإلغاء'),
          content: Text(
            hadDepositProofSubmitted
                ? 'هل أنت متأكد من إلغاء هذا الطلب؟\n\nلو حوّلت العربون بالفعل، تواصل مع المطبخ بخصوص المبلغ — الاسترداد يتم يدويًا خارج التطبيق.'
                : 'هل أنت متأكد من إلغاء هذا الطلب؟',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('رجوع'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('نعم، ألغِ الطلب'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }

    try {
      final tokenJwt = await requireSessionJwt(context);
      await _orderService.cancelOrder(
        sessionToken: tokenJwt,
        orderId: orderId,
      );
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _submitReview(String orderId) async {
    if (_selectedRating < 1 || _submittingReview) {
      return;
    }

    setState(() => _submittingReview = true);
    try {
      final tokenJwt = await requireSessionJwt(context);
      await _orderService.submitReview(
        sessionToken: tokenJwt,
        orderId: orderId,
        ratingValue: _selectedRating,
        comment: _reviewCommentController.text.trim().isEmpty
            ? null
            : _reviewCommentController.text.trim(),
      );
      _reviewCommentController.clear();
      _selectedRating = 0;
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _submittingReview = false);
      }
    }
  }
}

List<Widget> _customerTimelineRows(CustomerOrderDetails order) {
  final stage = customerOrderStage(order.status);
  if (stage == CustomerOrderStage.rejected ||
      stage == CustomerOrderStage.cancelled) {
    return [
      _TimelineRow(
        label: stage == CustomerOrderStage.rejected
            ? 'مرفوض من المطبخ'
            : 'تم إلغاء الطلب',
        date: order.placedAt,
        isDone: true,
      ),
    ];
  }

  final pastDeposit = stage == CustomerOrderStage.preparing ||
      stage == CustomerOrderStage.onTheWay ||
      stage == CustomerOrderStage.confirmReceipt ||
      stage == CustomerOrderStage.completed;
  final pastPreparing = stage == CustomerOrderStage.onTheWay ||
      stage == CustomerOrderStage.confirmReceipt ||
      stage == CustomerOrderStage.completed;
  final pastDelivery = stage == CustomerOrderStage.confirmReceipt ||
      stage == CustomerOrderStage.completed;

  return [
    _TimelineRow(
      label: 'تم إرسال الطلب',
      date: order.placedAt,
      isDone: true,
    ),
    _TimelineRow(
      label: 'موافقة المطبخ',
      date: order.acceptedAt,
      isDone: stage != CustomerOrderStage.awaitingKitchen,
    ),
    _TimelineRow(
      label: stage == CustomerOrderStage.depositReview
          ? 'بانتظار تأكيد العربون'
          : stage == CustomerOrderStage.payDeposit
              ? 'ادفع العربون'
              : 'تم تأكيد العربون',
      date: order.depositConfirmedAt ?? order.depositSubmittedAt,
      isDone: pastDeposit,
    ),
    _TimelineRow(
      label: 'التحضير',
      date: order.depositConfirmedAt,
      isDone: pastPreparing,
    ),
    _TimelineRow(
      label: order.deliveryType == 'PICKUP' ? 'الاستلام' : 'التوصيل',
      date: order.deliveredAt,
      isDone: pastDelivery,
    ),
    _TimelineRow(
      label: stage == CustomerOrderStage.completed
          ? 'مكتمل'
          : 'تأكيد الاستلام',
      date: order.completedAt,
      isDone: stage == CustomerOrderStage.completed,
    ),
  ];
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.date,
    required this.isDone,
  });

  final String label;
  final DateTime? date;
  final bool isDone;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
            color: isDone ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(label)),
          Text(
            date == null ? '--' : '${date!.hour}:${date!.minute.toString().padLeft(2, '0')}',
            style: TextStyle(color: Colors.grey.shade700),
          ),
        ],
      ),
    );
  }
}

class _SummaryText extends StatelessWidget {
  const _SummaryText({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(label),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _KitchenContactCard extends StatelessWidget {
  const _KitchenContactCard({
    required this.kitchenName,
    required this.phone,
  });

  final String kitchenName;
  final String phone;

  String get _local => normalizePhone(phone);

  Uri? get _telUri {
    if (_local.isEmpty) return null;
    if (isValidPhone(_local)) {
      return Uri.parse('tel:+20${_local.substring(1)}');
    }
    return Uri.parse('tel:$_local');
  }

  Uri? get _whatsAppUri {
    if (!isValidPhone(_local)) return null;
    return Uri.parse('https://wa.me/20${_local.substring(1)}');
  }

  Future<void> _launch(Uri? uri) async {
    if (uri == null) return;
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFECFDF5),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'تواصل مع المطبخ',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'تم قبول طلبك من «$kitchenName». يمكنك التواصل عبر شات الطلب، أو الاتصال / واتساب مباشرة.',
              style: const TextStyle(height: 1.5),
            ),
            const SizedBox(height: 12),
            Text(
              _local,
              textDirection: TextDirection.ltr,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _launch(_telUri),
                    icon: const Icon(Icons.call_outlined),
                    label: const Text('اتصال'),
                  ),
                ),
                if (_whatsAppUri != null) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _launch(_whatsAppUri),
                      icon: const Icon(Icons.chat_outlined),
                      label: const Text('واتساب'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
