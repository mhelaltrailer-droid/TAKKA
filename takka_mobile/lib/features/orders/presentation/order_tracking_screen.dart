import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/network/mobile_upload_service.dart';
import '../../../core/realtime/pusher_realtime_service.dart';
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
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    return _orderService.loadOrderDetails(
      sessionToken: token.jwt,
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
                        Text('الحالة الحالية: ${order.status}'),
                        Text(
                          'طريقة الاستلام: ${order.deliveryType == 'DELIVERY' ? 'توصيل' : 'استلام'}',
                        ),
                        if (order.addressLine != null)
                          Text('العنوان: ${order.addressLine}'),
                      ],
                    ),
                  ),
                ),
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
                        _TimelineRow(
                          label: 'تم إنشاء الطلب',
                          date: order.placedAt,
                          isDone: order.placedAt != null,
                        ),
                        _TimelineRow(
                          label: 'تم قبول الطلب',
                          date: order.acceptedAt,
                          isDone: order.acceptedAt != null,
                        ),
                        _TimelineRow(
                          label: 'تم إرسال إثبات العربون',
                          date: order.depositSubmittedAt,
                          isDone: order.depositSubmittedAt != null,
                        ),
                        _TimelineRow(
                          label: 'تم تأكيد العربون',
                          date: order.depositConfirmedAt,
                          isDone: order.depositConfirmedAt != null,
                        ),
                        _TimelineRow(
                          label: 'تم التسليم',
                          date: order.deliveredAt,
                          isDone: order.deliveredAt != null,
                        ),
                        _TimelineRow(
                          label: 'اكتمل الطلب',
                          date: order.completedAt,
                          isDone: order.completedAt != null,
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
                          'ملخص المبالغ',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _SummaryText(
                          label: 'المجموع',
                          value: '${order.subtotalAmount.toStringAsFixed(0)} ج.م',
                        ),
                        _SummaryText(
                          label: 'التوصيل',
                          value: '${order.deliveryFee.toStringAsFixed(0)} ج.م',
                        ),
                        _SummaryText(
                          label: 'الإجمالي',
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
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Text(
                                          message.fileUrl!,
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
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
                    ),
                  ),
                ),
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
                if (order.status == 'COMPLETED') ...[
                  const SizedBox(height: 14),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'التقييم',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (order.reviewRating != null) ...[
                            Text('تقييمك الحالي: ${order.reviewRating} / 5'),
                            if (order.reviewComment != null &&
                                order.reviewComment!.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(order.reviewComment!),
                              ),
                          ] else ...[
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: List.generate(
                                5,
                                (index) => OutlinedButton(
                                  onPressed: () => _submitReview(
                                    order.id,
                                    index + 1,
                                  ),
                                  child: Text('${index + 1} نجمة'),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _reviewCommentController,
                              maxLines: 3,
                              decoration: const InputDecoration(
                                hintText: 'تعليقك على الطلب',
                              ),
                            ),
                          ],
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

  Future<void> _submitDepositProof(String orderId) async {
    if (_depositUrlController.text.trim().isEmpty) {
      return;
    }

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _orderService.submitDepositProof(
        sessionToken: token.jwt,
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
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _orderService.sendOrderMessage(
        sessionToken: token.jwt,
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
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
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
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
        purpose: 'chatImage',
      );

      if (url == null) {
        return;
      }

      await _orderService.sendOrderMessage(
        sessionToken: token.jwt,
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
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _orderService.confirmReceived(
        sessionToken: token.jwt,
        orderId: orderId,
      );
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }

  Future<void> _submitReview(String orderId, int ratingValue) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _orderService.submitReview(
        sessionToken: token.jwt,
        orderId: orderId,
        ratingValue: ratingValue,
        comment: _reviewCommentController.text.trim().isEmpty
            ? null
            : _reviewCommentController.text.trim(),
      );
      _reviewCommentController.clear();
      setState(() => _future = _load());
    } catch (error) {
      _showError(error);
    }
  }
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
