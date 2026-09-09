/** Egyptian mobile: 01xxxxxxxxx (11 digits), e.g. 01111989094 */
const EGYPT_MOBILE_REGEX = /^01[0125][0-9]{8}$/;

export function normalizeEgyptianPhone(input: string): string {
  return input.replace(/[\s\-()]/g, "").trim();
}

export function isValidEgyptianPhone(input: string): boolean {
  return EGYPT_MOBILE_REGEX.test(normalizeEgyptianPhone(input));
}

/** Convert 01111989094 -> +201111989094 for Clerk E.164 */
export function toClerkPhoneE164(input: string): string {
  const local = normalizeEgyptianPhone(input);

  if (!isValidEgyptianPhone(local)) {
    throw new Error("رقم الهاتف المصري غير صالح.");
  }

  return `+20${local.slice(1)}`;
}

export function phoneValidationMessage(input: string): string | null {
  const local = normalizeEgyptianPhone(input);

  if (!local) {
    return "رقم الهاتف مطلوب.";
  }

  if (!isValidEgyptianPhone(local)) {
    return "أدخل رقمًا مصريًا صحيحًا مثل 01111989094.";
  }

  return null;
}
