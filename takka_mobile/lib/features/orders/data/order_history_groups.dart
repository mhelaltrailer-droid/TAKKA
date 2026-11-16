const _monthsAr = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

DateTime _startOfDay(DateTime date) {
  final local = date.toLocal();
  return DateTime(local.year, local.month, local.day);
}

String orderHistoryDayLabel(DateTime date, {DateTime? now}) {
  final clock = now ?? DateTime.now();
  final diff = _startOfDay(clock).difference(_startOfDay(date)).inDays;
  if (diff == 0) return 'اليوم';
  if (diff == 1) return 'أمس';
  final local = date.toLocal();
  final month = _monthsAr[local.month - 1];
  return '${local.day} $month ${local.year}';
}

String formatOrderClock(DateTime date) {
  final local = date.toLocal();
  final suffix = local.hour >= 12 ? 'م' : 'ص';
  final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minutes = local.minute.toString().padLeft(2, '0');
  return '$hour12:$minutes $suffix';
}

class OrderHistoryGroup<T> {
  const OrderHistoryGroup({required this.label, required this.orders});

  final String label;
  final List<T> orders;
}

List<OrderHistoryGroup<T>> groupOrdersNewestFirst<T>(
  List<T> orders, {
  required DateTime? Function(T order) createdAt,
  DateTime? now,
}) {
  final sorted = [...orders]..sort((a, b) {
    final left = createdAt(a) ?? DateTime.fromMillisecondsSinceEpoch(0);
    final right = createdAt(b) ?? DateTime.fromMillisecondsSinceEpoch(0);
    return right.compareTo(left);
  });

  final groups = <OrderHistoryGroup<T>>[];
  for (final order in sorted) {
    final when = createdAt(order);
    final label = when == null
        ? 'تاريخ غير معروف'
        : orderHistoryDayLabel(when, now: now);
    if (groups.isEmpty || groups.last.label != label) {
      groups.add(OrderHistoryGroup(label: label, orders: [order]));
    } else {
      groups.last.orders.add(order);
    }
  }
  return groups;
}
