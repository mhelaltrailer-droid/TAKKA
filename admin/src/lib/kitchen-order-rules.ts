/**
 * Pure kitchen-order rules. Numeric limits and the customer message are
 * seeded into KitchenOrderPolicy once; callers must pass the saved policy
 * rather than reading these defaults at decision time.
 */

export const KITCHEN_NO_RESPONSE_REASON = "KITCHEN_NO_RESPONSE";
export const KITCHEN_ORDER_POLICY_ID = "default";

export const CUSTOMER_BUSY_BANNER =
  "المطبخ مشغول دلوقتي ومش بيستقبل طلبات. تقدر تشوف المنيو والتقييمات وترجع تطلب لما يفضى.";

export const CUSTOMER_CLOSED_BANNER =
  "المطبخ مقفول دلوقتي ومش بيستقبل طلبات. تقدر تشوف المنيو والتقييمات وترجع تطلب لما يفتح.";

export const ORDER_BUSY_ERROR =
  "المطبخ مشغول حاليًا ولا يستقبل طلبات. جرّب مطبخًا آخر أو عد لاحقًا.";

export const ORDER_CLOSED_ERROR =
  "المطبخ مغلق حاليًا ولا يستقبل طلبات. جرّب مطبخًا آخر أو عد لاحقًا.";

export const REORDER_BUSY_MESSAGE =
  "المطبخ مشغول دلوقتي ومش بيستقبل طلبات. تقدر تطلب تاني لما يفضى.";

export const REORDER_CLOSED_MESSAGE =
  "المطبخ مقفول دلوقتي ومش بيستقبل طلبات. تقدر تطلب تاني لما يفتح.";

export const AVAILABILITY_LABELS = {
  OPEN: "مفتوح",
  BUSY: "مشغول",
  CLOSED: "مغلق",
} as const;

export type AvailabilityCode = keyof typeof AVAILABILITY_LABELS;

export const LEVEL_1_SUSPENSION_MESSAGE_DEFAULT =
  "تم إيقاف استقبال الطلبات مؤقتًا لأن 3 طلبات انتهت مهلتها من غير رد خلال آخر 24 ساعة. لو مشغول، حط حالتك Busy عشان الطلبات ما توصلكش. اضغط «فهمت» عشان ترجع تستقبل طلبات.";

export const LEVEL_2_SUSPENSION_MESSAGE_DEFAULT =
  "تم إيقاف مطبخك لأن 20 طلب انتهت مهلتها من غير رد خلال آخر 3 شهور، وده بيأثر على ثقة العملاء. فريق تكة هيراجع حالة مطبخك ويتواصل معاك قريب.";

export const KITCHEN_REJECT_REASON_UNSPECIFIED = "بدون سبب مكتوب";

export type KitchenOrderPolicyValues = {
  acceptanceTimeoutMinutes: number;
  shortWindowCount: number;
  shortWindowHours: number;
  longWindowCount: number;
  longWindowDays: number;
  customerNoResponseMessage: string;
  level1SuspensionMessage: string;
  level2SuspensionMessage: string;
};

/** Seed only. Runtime decisions read the database row. */
export const KITCHEN_ORDER_POLICY_DEFAULTS: KitchenOrderPolicyValues = {
  acceptanceTimeoutMinutes: 10,
  shortWindowCount: 3,
  shortWindowHours: 24,
  longWindowCount: 20,
  longWindowDays: 90,
  customerNoResponseMessage:
    "المطبخ غير جاهز لاستقبال طلبك الآن، حاول في وقت لاحق",
  level1SuspensionMessage: LEVEL_1_SUSPENSION_MESSAGE_DEFAULT,
  level2SuspensionMessage: LEVEL_2_SUSPENSION_MESSAGE_DEFAULT,
};

export type SuspensionTrigger = "short" | "long" | "both";
export type SuspensionLevelCode = "LEVEL_1" | "LEVEL_2";

export function isNoResponseCancellation(
  cancelReason: string | null | undefined,
) {
  return cancelReason === KITCHEN_NO_RESPONSE_REASON;
}

export function customerFacingAvailability(
  status: AvailabilityCode,
  suspended: boolean,
): AvailabilityCode {
  if (suspended) {
    return "BUSY";
  }
  return status;
}

export function kitchenAcceptsOrders(input: {
  approvalStatus: string;
  availabilityStatus: AvailabilityCode;
  suspended: boolean;
}) {
  return (
    input.approvalStatus === "APPROVED" &&
    !input.suspended &&
    input.availabilityStatus === "OPEN"
  );
}

export function unavailableOrderError(input: {
  availabilityStatus: AvailabilityCode;
  suspended: boolean;
}) {
  const facing = customerFacingAvailability(
    input.availabilityStatus,
    input.suspended,
  );
  return facing === "BUSY" ? ORDER_BUSY_ERROR : ORDER_CLOSED_ERROR;
}

export function customerAvailabilityBanner(status: AvailabilityCode) {
  if (status === "BUSY") return CUSTOMER_BUSY_BANNER;
  if (status === "CLOSED") return CUSTOMER_CLOSED_BANNER;
  return null;
}

export function acceptanceCutoff(now: Date, timeoutMinutes: number) {
  return new Date(now.getTime() - timeoutMinutes * 60_000);
}

export function isAwaitingAcceptancePastDeadline(
  placedAt: Date,
  timeoutMinutes: number,
  now: Date,
) {
  return placedAt.getTime() <= acceptanceCutoff(now, timeoutMinutes).getTime();
}

export function rollingWindowStart(
  now: Date,
  amount: number,
  unit: "hours" | "days",
) {
  const ms =
    unit === "hours" ? amount * 60 * 60 * 1000 : amount * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - ms);
}

export function suspensionDecision(input: {
  shortCount: number;
  longCount: number;
  shortWindowCount: number;
  longWindowCount: number;
}): SuspensionTrigger | null {
  const shortHit = input.shortCount >= input.shortWindowCount;
  const longHit = input.longCount >= input.longWindowCount;
  if (shortHit && longHit) return "both";
  if (shortHit) return "short";
  if (longHit) return "long";
  return null;
}

export function suspensionLevelFor(
  trigger: SuspensionTrigger | null,
): SuspensionLevelCode | null {
  if (trigger === "short") return "LEVEL_1";
  if (trigger === "long" || trigger === "both") return "LEVEL_2";
  return null;
}

export function suspensionMessageFor(
  level: SuspensionLevelCode,
  policy: Pick<
    KitchenOrderPolicyValues,
    "level1SuspensionMessage" | "level2SuspensionMessage"
  >,
) {
  return level === "LEVEL_1"
    ? policy.level1SuspensionMessage
    : policy.level2SuspensionMessage;
}

/** Level 1 lifts when the owner taps «فهمت». Level 2 stays until an admin reactivates. */
export function ownerCanLiftSuspension(level: SuspensionLevelCode | null) {
  return level === "LEVEL_1";
}

type PolicyTextKey =
  | "customerNoResponseMessage"
  | "level1SuspensionMessage"
  | "level2SuspensionMessage";

type IntPolicyKey = Exclude<keyof KitchenOrderPolicyValues, PolicyTextKey>;

type PolicyField = {
  key: IntPolicyKey;
  label: string;
  min: number;
  max: number;
};

const INT_FIELDS: PolicyField[] = [
  {
    key: "acceptanceTimeoutMinutes",
    label: "مهلة قبول الطلب بالدقائق",
    min: 1,
    max: 180,
  },
  {
    key: "shortWindowCount",
    label: "عدد عدم الرد في النافذة القصيرة",
    min: 1,
    max: 100,
  },
  {
    key: "shortWindowHours",
    label: "ساعات النافذة القصيرة",
    min: 1,
    max: 168,
  },
  {
    key: "longWindowCount",
    label: "عدد عدم الرد في النافذة الطويلة",
    min: 1,
    max: 1000,
  },
  {
    key: "longWindowDays",
    label: "أيام النافذة الطويلة",
    min: 1,
    max: 365,
  },
];

function readInt(
  value: unknown,
  label: string,
  min: number,
  max: number,
): { ok: true; value: number } | { ok: false; error: string } {
  const text =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^\d+$/.test(text)) {
    return { ok: false, error: `${label} لازم يكون رقمًا صحيحًا.` };
  }
  const parsed = Number(text);
  if (parsed < min || parsed > max) {
    return { ok: false, error: `${label} لازم يكون بين ${min} و ${max}.` };
  }
  return { ok: true, value: parsed };
}

export function parseKitchenOrderPolicyInput(
  raw: Record<string, unknown>,
):
  | { ok: true; value: KitchenOrderPolicyValues }
  | { ok: false; error: string } {
  const value = {} as KitchenOrderPolicyValues;
  for (const field of INT_FIELDS) {
    const parsed = readInt(raw[field.key], field.label, field.min, field.max);
    if (!parsed.ok) return parsed;
    value[field.key] = parsed.value;
  }

  const textFields: Array<{ key: PolicyTextKey; label: string }> = [
    { key: "customerNoResponseMessage", label: "رسالة العميل" },
    { key: "level1SuspensionMessage", label: "رسالة إيقاف المستوى 1" },
    { key: "level2SuspensionMessage", label: "رسالة إيقاف المستوى 2" },
  ];
  for (const field of textFields) {
    const rawMessage = raw[field.key];
    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
    if (message.length < 8 || message.length > 800) {
      return {
        ok: false,
        error: `${field.label} لازم تكون بين 8 و 800 حرف.`,
      };
    }
    value[field.key] = message;
  }
  return { ok: true, value };
}
