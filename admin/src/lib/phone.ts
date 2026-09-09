/** Mobile: starts with 01 and is exactly 11 digits, e.g. 01********* */
const MOBILE_REGEX = /^01[0-9]{9}$/;

export function normalizeEgyptianPhone(input: string): string {
  return input.replace(/[\s\-()]/g, "").trim();
}

export function isValidEgyptianPhone(input: string): boolean {
  return MOBILE_REGEX.test(normalizeEgyptianPhone(input));
}

/** Convert 01xxxxxxxxx -> +20xxxxxxxxx for Clerk E.164 */
export function toClerkPhoneE164(input: string): string {
  const local = normalizeEgyptianPhone(input);

  if (!isValidEgyptianPhone(local)) {
    throw new Error("رقم الهاتف غير صالح.");
  }

  return `+20${local.slice(1)}`;
}

export function phoneValidationMessage(input: string): string | null {
  const local = normalizeEgyptianPhone(input);

  if (!local) {
    return "رقم الهاتف مطلوب.";
  }

  if (!local.startsWith("01")) {
    return "رقم الهاتف يجب أن يبدأ بـ 01.";
  }

  if (local.length !== 11 || !MOBILE_REGEX.test(local)) {
    return "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01.";
  }

  return null;
}
