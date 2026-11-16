/**
 * Takka customer-support WhatsApp number.
 * SUPPORT_WHATSAPP_NUMBER is optional; the public default is used when unset
 * or invalid. Exposed on GET /api/mobile/app-version. Nothing is sent from
 * the server — the client opens WhatsApp itself.
 */

export const DEFAULT_SUPPORT_WHATSAPP_NUMBER = "+201515327198";

const DIGITS_RE = /^\d{8,15}$/;

export function normalizeSupportWhatsappNumber(raw: string): string | null {
  let value = raw.trim().replace(/[\s()-]/g, "");
  if (!value) return null;
  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  }
  if (value.startsWith("+")) {
    const digits = value.slice(1);
    return DIGITS_RE.test(digits) ? `+${digits}` : null;
  }
  if (value.startsWith("0") && value.length === 11 && value.startsWith("01")) {
    return `+2${value}`;
  }
  if (DIGITS_RE.test(value)) {
    return `+${value}`;
  }
  return null;
}

export function resolveSupportWhatsappNumber(
  env: Record<string, string | undefined>,
): string {
  const raw = (env.SUPPORT_WHATSAPP_NUMBER ?? "").trim();
  if (!raw) return DEFAULT_SUPPORT_WHATSAPP_NUMBER;
  return (
    normalizeSupportWhatsappNumber(raw) ?? DEFAULT_SUPPORT_WHATSAPP_NUMBER
  );
}

export function supportWhatsappDigits(number: string): string {
  return number.replace(/\D/g, "");
}

export function buildOrderSupportMessage(input: {
  orderNumber: string;
  kitchenName: string;
  problemLabel: string;
  note?: string | null;
}): string {
  const lines = [
    "السلام عليكم، أنا عميل على تكة ومحتاج مساعدة.",
    `رقم الطلب: ${input.orderNumber.trim()}`,
    `المطبخ: ${input.kitchenName.trim()}`,
    `المشكلة: ${input.problemLabel.trim()}`,
  ];
  const note = input.note?.trim();
  if (note) {
    lines.push(`تفاصيل: ${note}`);
  }
  return lines.join("\n");
}

export function supportWhatsappUrl(number: string, message: string): string {
  const digits = supportWhatsappDigits(number);
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${digits}?${params.toString()}`;
}
