import type { OrderStatus } from "@prisma/client";

import { normalizeEgyptianPhone } from "@/lib/phone";

/** Kitchen phone is revealed to the customer only after the kitchen accepts the order. */
export function canCustomerSeeKitchenPhone(params: {
  acceptedAt: Date | string | null | undefined;
  status?: OrderStatus | string | null;
}): boolean {
  if (params.acceptedAt) {
    return true;
  }
  // Fallback if acceptedAt missing on older rows but status already past approval.
  const status = params.status ?? "";
  return (
    status !== "" &&
    status !== "PENDING_KITCHEN_APPROVAL" &&
    status !== "REJECTED_BY_KITCHEN"
  );
}

export function formatKitchenPhoneForDisplay(phone: string): string {
  return normalizeEgyptianPhone(phone);
}

/** tel: link for Egyptian mobile 01xxxxxxxxx */
export function kitchenTelHref(phone: string): string | null {
  const local = normalizeEgyptianPhone(phone);
  if (!/^01[0-9]{9}$/.test(local)) {
    return local ? `tel:${local}` : null;
  }
  return `tel:+20${local.slice(1)}`;
}

/** WhatsApp deep link for Egyptian mobile */
export function kitchenWhatsAppHref(phone: string): string | null {
  const local = normalizeEgyptianPhone(phone);
  if (!/^01[0-9]{9}$/.test(local)) {
    return null;
  }
  return `https://wa.me/20${local.slice(1)}`;
}
