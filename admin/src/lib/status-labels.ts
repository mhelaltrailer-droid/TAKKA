import {
  ApprovalStatus,
  AvailabilityStatus,
  DeliveryType,
  DepositReviewStatus,
} from "@prisma/client";

export function getApprovalStatusLabel(status: ApprovalStatus) {
  switch (status) {
    case ApprovalStatus.PENDING:
      return "قيد المراجعة";
    case ApprovalStatus.APPROVED:
      return "معتمد";
    case ApprovalStatus.REJECTED:
      return "مرفوض";
  }
}

export function getAvailabilityStatusLabel(status: AvailabilityStatus) {
  switch (status) {
    case AvailabilityStatus.OPEN:
      return "مفتوح";
    case AvailabilityStatus.CLOSED:
      return "مغلق";
  }
}

export function getDeliveryTypeLabel(deliveryType: DeliveryType) {
  switch (deliveryType) {
    case DeliveryType.PICKUP:
      return "استلام";
    case DeliveryType.DELIVERY:
      return "توصيل";
  }
}

export function getDepositReviewStatusLabel(status: DepositReviewStatus) {
  switch (status) {
    case DepositReviewStatus.PENDING:
      return "قيد المراجعة";
    case DepositReviewStatus.ACCEPTED:
      return "مقبول";
    case DepositReviewStatus.REJECTED:
      return "مرفوض";
  }
}
