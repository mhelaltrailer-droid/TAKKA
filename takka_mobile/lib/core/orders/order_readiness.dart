/// Menu item order readiness — keep labels in sync with web `order-readiness.ts`.
class OrderReadinessOption {
  const OrderReadinessOption({
    required this.id,
    required this.label,
    required this.hint,
  });

  final String id;
  final String label;
  final String hint;
}

const orderReadinessFieldLabel = 'جاهزية الطلب';
const orderReadinessCustomerQuestion = 'متى يكون جاهز؟';

const List<OrderReadinessOption> orderReadinessOptions = [
  OrderReadinessOption(
    id: 'AVAILABLE_NOW',
    label: 'متاح الآن',
    hint: 'استلام أو توصيل في أقرب وقت حسب المطبخ',
  ),
  OrderReadinessOption(
    id: 'PREORDER',
    label: 'حجز مسبق',
    hint: 'يحتاج تجهيز مسبق (مثل التسليم في اليوم التالي)',
  ),
  OrderReadinessOption(
    id: 'ASK_KITCHEN',
    label: 'اسأل المطبخ',
    hint: 'تواصل مع المطبخ لمعرفة إمكانية وموعد الاستلام أو التوصيل',
  ),
];

String orderReadinessLabel(String? value) {
  for (final option in orderReadinessOptions) {
    if (option.id == value) {
      return option.label;
    }
  }
  return orderReadinessOptions.first.label;
}

bool isOrderReadinessId(String value) {
  return orderReadinessOptions.any((option) => option.id == value);
}

String normalizeOrderReadiness(String? value) {
  if (value != null && isOrderReadinessId(value)) {
    return value;
  }
  return orderReadinessOptions.first.id;
}
