import { DeliveryType, OrderStatus } from "@prisma/client";

/**
 * مراحل مبسّطة ظاهرة للعميل فقط.
 * الحالات الداخلية للمطبخ/الأدمن تبقى كما هي عبر getOrderStatusLabel.
 */
export type CustomerOrderStage =
  | "AWAITING_KITCHEN"
  | "PAY_DEPOSIT"
  | "DEPOSIT_REVIEW"
  | "PREPARING"
  | "ON_THE_WAY"
  | "CONFIRM_RECEIPT"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export function getCustomerOrderStage(status: OrderStatus): CustomerOrderStage {
  switch (status) {
    case OrderStatus.PENDING_KITCHEN_APPROVAL:
      return "AWAITING_KITCHEN";
    case OrderStatus.ACCEPTED_AWAITING_DEPOSIT:
      return "PAY_DEPOSIT";
    case OrderStatus.DEPOSIT_PROOF_SUBMITTED:
      return "DEPOSIT_REVIEW";
    case OrderStatus.DEPOSIT_CONFIRMED:
    case OrderStatus.PREPARING:
      return "PREPARING";
    case OrderStatus.READY_FOR_PICKUP:
    case OrderStatus.AWAITING_CUSTOMER_ARRIVAL:
    case OrderStatus.OUT_FOR_DELIVERY:
      return "ON_THE_WAY";
    case OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER:
    case OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM:
      return "CONFIRM_RECEIPT";
    case OrderStatus.COMPLETED:
      return "COMPLETED";
    case OrderStatus.REJECTED_BY_KITCHEN:
      return "REJECTED";
    case OrderStatus.CANCELLED_BEFORE_DEPOSIT:
    case OrderStatus.CANCELLED_AFTER_DEPOSIT:
      return "CANCELLED";
  }
}

export function getCustomerOrderStatusLabel(
  status: OrderStatus,
  deliveryType: DeliveryType = DeliveryType.DELIVERY,
): string {
  switch (getCustomerOrderStage(status)) {
    case "AWAITING_KITCHEN":
      return "بانتظار موافقة المطبخ";
    case "PAY_DEPOSIT":
      return "ادفع العربون";
    case "DEPOSIT_REVIEW":
      return "بانتظار تأكيد العربون";
    case "PREPARING":
      return "جاري التحضير";
    case "ON_THE_WAY":
      return deliveryType === DeliveryType.PICKUP
        ? "جاهز للاستلام"
        : "في الطريق إليك";
    case "CONFIRM_RECEIPT":
      return "أكّد استلام الطلب";
    case "COMPLETED":
      return "مكتمل";
    case "REJECTED":
      return "مرفوض من المطبخ";
    case "CANCELLED":
      return "تم الإلغاء";
  }
}

export function getCustomerOrderStatusHint(
  status: OrderStatus,
  deliveryType: DeliveryType = DeliveryType.DELIVERY,
): string {
  switch (getCustomerOrderStage(status)) {
    case "AWAITING_KITCHEN":
      return "المطبخ هيراجع الطلب ويحدّد رسوم التوصيل إن وُجدت.";
    case "PAY_DEPOSIT":
      return "حوّل العربون وأرسل صورة الإثبات عشان يبدأ التحضير.";
    case "DEPOSIT_REVIEW":
      return "المطبخ بيراجع إثبات العربون.";
    case "PREPARING":
      return "المطبخ بيجهّز طلبك.";
    case "ON_THE_WAY":
      return deliveryType === DeliveryType.PICKUP
        ? "الطلب جاهز — توجّه لاستلامه من المطبخ."
        : "الطلب في الطريق لعنوانك.";
    case "CONFIRM_RECEIPT":
      return "ادفع الباقي عند الاستلام، ثم أكّد إنك استلمت الطلب.";
    case "COMPLETED":
      return "تم إنهاء الطلب. تقدر تقيّم المطبخ.";
    case "REJECTED":
      return "المطبخ رفض الطلب. تقدر تطلب من مطبخ آخر.";
    case "CANCELLED":
      return "تم إلغاء هذا الطلب.";
  }
}

/** العميل يلغي فقط قبل تأكيد العربون. */
export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return (
    status === OrderStatus.PENDING_KITCHEN_APPROVAL ||
    status === OrderStatus.ACCEPTED_AWAITING_DEPOSIT ||
    status === OrderStatus.DEPOSIT_PROOF_SUBMITTED
  );
}
