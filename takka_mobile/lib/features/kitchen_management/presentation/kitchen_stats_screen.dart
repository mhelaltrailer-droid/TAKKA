import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/ui/takka_error_retry.dart';
import '../data/kitchen_management_service.dart';

class KitchenStatsScreen extends StatefulWidget {
  const KitchenStatsScreen({super.key});

  @override
  State<KitchenStatsScreen> createState() => _KitchenStatsScreenState();
}

class _KitchenStatsScreenState extends State<KitchenStatsScreen> {
  final _service = const KitchenManagementService();
  DateTimeRange? _range;
  Future<KitchenOrderStatsResult>? _future;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    _range = DateTimeRange(
      start: today.subtract(const Duration(days: 29)),
      end: today,
    );
    _future = _load();
  }

  String _key(DateTime date) {
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '${date.year}-$m-$d';
  }

  Future<KitchenOrderStatsResult> _load() async {
    final authState = ClerkAuth.of(context, listen: false);
    final token = await authState.sessionToken();
    final range = _range;
    return _service.loadOrderStats(
      sessionToken: token.jwt,
      from: range == null ? null : _key(range.start),
      to: range == null ? null : _key(range.end),
    );
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year, now.month, now.day),
      initialDateRange: _range,
      helpText: 'اختر مدة الإحصائيات',
      cancelText: 'إلغاء',
      confirmText: 'تطبيق',
    );
    if (picked == null) return;
    setState(() {
      _range = picked;
      _future = _load();
    });
  }

  void _reset30Days() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    setState(() {
      _range = DateTimeRange(
        start: today.subtract(const Duration(days: 29)),
        end: today,
      );
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إحصائيات'),
        actions: [
          IconButton(
            onPressed: _pickRange,
            icon: const Icon(Icons.date_range_outlined),
            tooltip: 'تحديد مدة',
          ),
        ],
      ),
      body: FutureBuilder<KitchenOrderStatsResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: TakkaErrorRetry(
                onRetry: () => setState(() => _future = _load()),
              ),
            );
          }

          final data = snapshot.data!;
          final stats = data.stats;
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                data.kitchenName,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'من ${data.from} إلى ${data.to}',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: _pickRange,
                    child: const Text('تحديد مدة'),
                  ),
                  TextButton(
                    onPressed: _reset30Days,
                    child: const Text('آخر 30 يومًا'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _StatTile(label: 'إجمالي الطلبات', value: '${stats.totalOrders}'),
              _StatTile(
                label: 'مكتملة (تم التسليم)',
                value: '${stats.completed}',
              ),
              _StatTile(
                label: 'ملغاة',
                value: '${stats.cancelledTotal}',
                hint:
                    'رفض مطبخ: ${stats.rejectedByKitchen} · إلغاء عميل: ${stats.cancelledByCustomer}',
              ),
              _StatTile(label: 'قيد التنفيذ', value: '${stats.inProgress}'),
              _StatTile(
                label: 'مبيعات المكتملة',
                value: '${stats.salesCompleted.toStringAsFixed(0)} ج.م',
              ),
              _StatTile(
                label: 'معدل الإكمال',
                value: '${stats.completionRate}%',
              ),
              _StatTile(
                label: 'مشاهدات الصفحة',
                value: '${stats.viewsTotal}',
                hint: 'زوار فريدون: ${stats.uniqueVisitors}',
              ),
              _StatTile(
                label: 'نسبة التحويل',
                value: '${stats.conversionRate}%',
                hint: 'طلبات ÷ زوار فريدون',
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    this.hint,
  });

  final String label;
  final String value;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
            ),
            if (hint != null) ...[
              const SizedBox(height: 6),
              Text(hint!, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            ],
          ],
        ),
      ),
    );
  }
}
