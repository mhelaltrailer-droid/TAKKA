import type {
  KitchenJoinLeadSegment,
  KitchenJoinLeadStatus,
} from "@prisma/client";

import { isValidEgyptianPhone, normalizeEgyptianPhone } from "./phone";

export const KITCHEN_JOIN_SEGMENTS: {
  value: KitchenJoinLeadSegment;
  label: string;
}[] = [
  { value: "HOME_COOK", label: "ست بيت" },
  { value: "EXISTING_PAGE", label: "عندي بيدج أو مطبخ" },
  { value: "BEGINNER", label: "بفكّر أبدأ" },
];

/** Public /join-kitchen copy. Egyptian colloquial, feminine address. */
export const JOIN_KITCHEN_COPY = {
  phoneRequired: "اكتبي رقم الواتساب.",
  phoneInvalid: "رقم الواتساب لازم يكون 11 رقم ويبدأ بـ 01.",
  nameRequired: "اكتبي اسمك، حرفين على الأقل.",
  nameTooLong: "الاسم طويل أوي. اكتبيه أقصر.",
  districtRequired: "اختاري الحي.",
  districtTooLong: "اسم الحي طويل أوي.",
  otherDistrictRequired: "اكتبي اسم الحي.",
  segmentRequired: "اختاري نوع الانضمام.",
  duplicate:
    "الرقم مسجّل عندنا بالفعل. فريق تكة هيتواصل معاكي قريبًا لو لسه قيد المتابعة.",
  generic: "مش قادرين نسجّل دلوقتي. جرّبي تاني.",
  rateLimited: "طلبات كتير في وقت قصير. استني شوية وجرّبي تاني.",
  network: "الاتصال مش شغال. تأكدي من الإنترنت وجرّبي تاني.",
} as const;

export function joinKitchenPhoneError(input: string): string | null {
  const local = normalizeEgyptianPhone(input);
  if (!local) return JOIN_KITCHEN_COPY.phoneRequired;
  if (!isValidEgyptianPhone(local)) return JOIN_KITCHEN_COPY.phoneInvalid;
  return null;
}

export const KITCHEN_JOIN_STATUSES: {
  value: KitchenJoinLeadStatus;
  label: string;
}[] = [
  { value: "NEW", label: "جديد" },
  { value: "CONTACTED", label: "تم التواصل" },
  { value: "NO_REPLY", label: "لم يرد" },
  { value: "FOLLOW_UP", label: "متابعة لاحقًا" },
  { value: "APP_DOWNLOADED", label: "نزّلت التطبيق" },
  { value: "ACTIVE", label: "نشطة" },
  { value: "CLOSED", label: "غير مناسبة / أغلقت" },
];

export function kitchenJoinSegmentLabel(
  segment: KitchenJoinLeadSegment,
): string {
  return (
    KITCHEN_JOIN_SEGMENTS.find((item) => item.value === segment)?.label ??
    segment
  );
}

export function kitchenJoinStatusLabel(
  status: KitchenJoinLeadStatus,
): string {
  return (
    KITCHEN_JOIN_STATUSES.find((item) => item.value === status)?.label ??
    status
  );
}

export function isKitchenJoinSegment(
  value: string,
): value is KitchenJoinLeadSegment {
  return KITCHEN_JOIN_SEGMENTS.some((item) => item.value === value);
}

export function isKitchenJoinStatus(
  value: string,
): value is KitchenJoinLeadStatus {
  return KITCHEN_JOIN_STATUSES.some((item) => item.value === value);
}

export function normalizeLeadSource(
  raw: string | null | undefined,
): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  if (value.length > 64) return value.slice(0, 64);
  if (!/^[a-zA-Z0-9_.:-]+$/.test(value)) return null;
  return value;
}
