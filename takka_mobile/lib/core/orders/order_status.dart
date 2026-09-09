/// Active = placed and not finished/cancelled yet.
const previousOrderStatuses = {
  'COMPLETED',
  'CANCELLED_BEFORE_DEPOSIT',
  'CANCELLED_AFTER_DEPOSIT',
  'REJECTED_BY_KITCHEN',
};

bool isPreviousOrderStatus(String status) =>
    previousOrderStatuses.contains(status);

bool isActiveOrderStatus(String status) => !isPreviousOrderStatus(status);

String orderStatusLabelAr(String status) {
  switch (status) {
    case 'PENDING_KITCHEN_APPROVAL':
      return 'في انتظار موافقة المطبخ';
    case 'ACCEPTED_AWAITING_DEPOSIT':
      return 'تم القبول وفي انتظار العربون';
    case 'DEPOSIT_PROOF_SUBMITTED':
      return 'تم إرسال إثبات العربون';
    case 'DEPOSIT_CONFIRMED':
      return 'تم تأكيد العربون';
    case 'PREPARING':
      return 'جارٍ التحضير';
    case 'READY_FOR_PICKUP':
      return 'جاهز للاستلام';
    case 'AWAITING_CUSTOMER_ARRIVAL':
      return 'في انتظار وصول العميل';
    case 'OUT_FOR_DELIVERY':
      return 'خرج للتوصيل';
    case 'DELIVERED_BY_KITCHEN_OR_DRIVER':
      return 'تم التسليم من جهة المطبخ';
    case 'COMPLETED_AWAITING_CUSTOMER_CONFIRM':
      return 'في انتظار تأكيد العميل';
    case 'COMPLETED':
      return 'مكتمل';
    case 'CANCELLED_BEFORE_DEPOSIT':
      return 'تم الإلغاء';
    case 'CANCELLED_AFTER_DEPOSIT':
      return 'تم الإلغاء';
    case 'REJECTED_BY_KITCHEN':
      return 'مرفوض من المطبخ';
    default:
      return status;
  }
}
