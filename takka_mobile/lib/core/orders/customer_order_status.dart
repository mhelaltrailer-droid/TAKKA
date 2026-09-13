/// مراحل مبسّطة ظاهرة للعميل فقط.
/// الحالات الداخلية للمطبخ تبقى كما هي عبر [orderStatusLabelAr].

enum CustomerOrderStage {
  awaitingKitchen,
  payDeposit,
  depositReview,
  preparing,
  onTheWay,
  confirmReceipt,
  completed,
  rejected,
  cancelled,
}

CustomerOrderStage customerOrderStage(String status) {
  switch (status) {
    case 'PENDING_KITCHEN_APPROVAL':
      return CustomerOrderStage.awaitingKitchen;
    case 'ACCEPTED_AWAITING_DEPOSIT':
      return CustomerOrderStage.payDeposit;
    case 'DEPOSIT_PROOF_SUBMITTED':
      return CustomerOrderStage.depositReview;
    case 'DEPOSIT_CONFIRMED':
    case 'PREPARING':
      return CustomerOrderStage.preparing;
    case 'READY_FOR_PICKUP':
    case 'AWAITING_CUSTOMER_ARRIVAL':
    case 'OUT_FOR_DELIVERY':
      return CustomerOrderStage.onTheWay;
    case 'DELIVERED_BY_KITCHEN_OR_DRIVER':
    case 'COMPLETED_AWAITING_CUSTOMER_CONFIRM':
      return CustomerOrderStage.confirmReceipt;
    case 'COMPLETED':
      return CustomerOrderStage.completed;
    case 'REJECTED_BY_KITCHEN':
      return CustomerOrderStage.rejected;
    case 'CANCELLED_BEFORE_DEPOSIT':
    case 'CANCELLED_AFTER_DEPOSIT':
      return CustomerOrderStage.cancelled;
    default:
      return CustomerOrderStage.awaitingKitchen;
  }
}

String customerOrderStatusLabel(
  String status, {
  String deliveryType = 'DELIVERY',
}) {
  switch (customerOrderStage(status)) {
    case CustomerOrderStage.awaitingKitchen:
      return 'بانتظار موافقة المطبخ';
    case CustomerOrderStage.payDeposit:
      return 'ادفع العربون';
    case CustomerOrderStage.depositReview:
      return 'بانتظار تأكيد العربون';
    case CustomerOrderStage.preparing:
      return 'جاري التحضير';
    case CustomerOrderStage.onTheWay:
      return deliveryType == 'PICKUP' ? 'جاهز للاستلام' : 'في الطريق إليك';
    case CustomerOrderStage.confirmReceipt:
      return 'أكّد استلام الطلب';
    case CustomerOrderStage.completed:
      return 'مكتمل';
    case CustomerOrderStage.rejected:
      return 'مرفوض من المطبخ';
    case CustomerOrderStage.cancelled:
      return 'تم الإلغاء';
  }
}

String customerOrderStatusHint(
  String status, {
  String deliveryType = 'DELIVERY',
}) {
  switch (customerOrderStage(status)) {
    case CustomerOrderStage.awaitingKitchen:
      return 'المطبخ هيراجع الطلب ويحدّد رسوم التوصيل إن وُجدت.';
    case CustomerOrderStage.payDeposit:
      return 'حوّل العربون وأرسل صورة الإثبات عشان يبدأ التحضير.';
    case CustomerOrderStage.depositReview:
      return 'المطبخ بيراجع إثبات العربون.';
    case CustomerOrderStage.preparing:
      return 'المطبخ بيجهّز طلبك.';
    case CustomerOrderStage.onTheWay:
      return deliveryType == 'PICKUP'
          ? 'الطلب جاهز — توجّه لاستلامه من المطبخ.'
          : 'الطلب في الطريق لعنوانك.';
    case CustomerOrderStage.confirmReceipt:
      return 'ادفع الباقي عند الاستلام، ثم أكّد إنك استلمت الطلب.';
    case CustomerOrderStage.completed:
      return 'تم إنهاء الطلب. تقدر تقيّم المطبخ.';
    case CustomerOrderStage.rejected:
      return 'المطبخ رفض الطلب. تقدر تطلب من مطبخ آخر.';
    case CustomerOrderStage.cancelled:
      return 'تم إلغاء هذا الطلب.';
  }
}

/// العميل يلغي فقط قبل تأكيد العربون.
bool canCustomerCancelOrder(String status) {
  return status == 'PENDING_KITCHEN_APPROVAL' ||
      status == 'ACCEPTED_AWAITING_DEPOSIT' ||
      status == 'DEPOSIT_PROOF_SUBMITTED';
}
