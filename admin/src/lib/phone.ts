/**
 * Mobile: starts with 01 and is exactly 11 digits, e.g. 01*********.
 * Shared with Flutter `takka_mobile/lib/core/validation/phone.dart`.
 *
 * Accepted input (then stored as 01XXXXXXXXX):
 * 01…, +201…, 00201…, 201…, and Arabic-Indic / Persian digits.
 */
const MOBILE_REGEX = /^01[0-9]{9}$/;
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;

export function toAsciiDigits(input: string): string {
  return input.replace(ARABIC_INDIC_DIGITS, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660);
    }
    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0);
    }
    return char;
  });
}

/** National 01XXXXXXXXX when the input is an Egyptian mobile; otherwise cleaned digits. */
export function normalizeEgyptianPhone(input: string): string {
  let value = toAsciiDigits(input)
    .replace(/[\s\-().\u200e\u200f\u202a-\u202e]/g, "")
    .trim();

  if (value.startsWith("+")) {
    value = value.slice(1);
  }

  let rest: string | null = null;
  if (value.startsWith("0020")) {
    rest = value.slice(4);
  } else if (value.startsWith("20")) {
    rest = value.slice(2);
  }

  if (rest != null) {
    if (/^01[0-9]{9}$/.test(rest)) return rest;
    if (/^1[0-9]{9}$/.test(rest)) return `0${rest}`;
  }

  return value;
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
