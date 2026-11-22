import { ApprovalStatus, AvailabilityStatus, type Prisma } from "@prisma/client";

/** Approved kitchens customers can browse: open, busy, or suspended. */
export function customerListedKitchenFilter(): Prisma.KitchenWhereInput {
  return {
    OR: [
      {
        availabilityStatus: {
          in: [AvailabilityStatus.OPEN, AvailabilityStatus.BUSY],
        },
      },
      { suspendedAt: { not: null } },
    ],
  };
}

/** Kitchens that may receive a new order. Busy, closed, and suspended are excluded. */
export function acceptingOrdersKitchenFilter(): Prisma.KitchenWhereInput {
  return {
    approvalStatus: ApprovalStatus.APPROVED,
    availabilityStatus: AvailabilityStatus.OPEN,
    suspendedAt: null,
  };
}
