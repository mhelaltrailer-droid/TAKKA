import { DeliveryType, OrderStatus } from "@prisma/client";

const PREVIOUS_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED_BEFORE_DEPOSIT,
  OrderStatus.CANCELLED_AFTER_DEPOSIT,
  OrderStatus.REJECTED_BY_KITCHEN,
];

export function isPreviousOrderStatus(status: OrderStatus) {
  return PREVIOUS_ORDER_STATUSES.includes(status);
}

export function isActiveOrderStatus(status: OrderStatus) {
  return !isPreviousOrderStatus(status);
}

export function getOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING_KITCHEN_APPROVAL:
      return "في انتظار موافقة المطبخ";
    case OrderStatus.ACCEPTED_AWAITING_DEPOSIT:
      return "تم القبول وفي انتظار العربون";
    case OrderStatus.DEPOSIT_PROOF_SUBMITTED:
      return "تم إرسال إثبات العربون";
    case OrderStatus.DEPOSIT_CONFIRMED:
      return "تم تأكيد العربون";
    case OrderStatus.PREPARING:
      return "جارٍ التحضير";
    case OrderStatus.READY_FOR_PICKUP:
      return "جاهز للاستلام";
    case OrderStatus.AWAITING_CUSTOMER_ARRIVAL:
      return "في انتظار وصول العميل";
    case OrderStatus.OUT_FOR_DELIVERY:
      return "خرج للتوصيل";
    case OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER:
      return "تم التسليم من جهة المطبخ";
    case OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM:
      return "في انتظار تأكيد العميل";
    case OrderStatus.COMPLETED:
      return "مكتمل";
    case OrderStatus.CANCELLED_BEFORE_DEPOSIT:
      return "تم الإلغاء";
    case OrderStatus.CANCELLED_AFTER_DEPOSIT:
      return "تم الإلغاء";
    case OrderStatus.REJECTED_BY_KITCHEN:
      return "مرفوض من المطبخ";
  }
}

export function getAllowedNextStatuses(
  status: OrderStatus,
  deliveryType: DeliveryType,
): OrderStatus[] {
  switch (status) {
    case OrderStatus.DEPOSIT_CONFIRMED:
      return [OrderStatus.PREPARING];
    case OrderStatus.PREPARING:
      return deliveryType === DeliveryType.PICKUP
        ? [OrderStatus.READY_FOR_PICKUP]
        : [OrderStatus.OUT_FOR_DELIVERY];
    case OrderStatus.READY_FOR_PICKUP:
      return [OrderStatus.AWAITING_CUSTOMER_ARRIVAL];
    case OrderStatus.AWAITING_CUSTOMER_ARRIVAL:
      return [OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER];
    case OrderStatus.OUT_FOR_DELIVERY:
      return [OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER];
    case OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER:
      return [OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM];
    case OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM:
      return [OrderStatus.COMPLETED];
    default:
      return [];
  }
}
