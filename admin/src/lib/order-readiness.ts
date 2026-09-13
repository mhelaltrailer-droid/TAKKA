/** Order readiness for menu items — keep in sync with Flutter `order_readiness.dart`. */

export const ORDER_READINESS_VALUES = [
  "AVAILABLE_NOW",
  "PREORDER",
  "ASK_KITCHEN",
] as const;

export type OrderReadinessValue = (typeof ORDER_READINESS_VALUES)[number];

export type OrderReadinessOption = {
  id: OrderReadinessValue;
  label: string;
  hint: string;
};

export const ORDER_READINESS_FIELD_LABEL = "جاهزية الطلب";
export const ORDER_READINESS_CUSTOMER_QUESTION = "متى يكون جاهز؟";

export const ORDER_READINESS_OPTIONS: OrderReadinessOption[] = [
  {
    id: "AVAILABLE_NOW",
    label: "متاح الآن",
    hint: "استلام أو توصيل في أقرب وقت حسب المطبخ",
  },
  {
    id: "PREORDER",
    label: "حجز مسبق",
    hint: "يحتاج تجهيز مسبق (مثل التسليم في اليوم التالي)",
  },
  {
    id: "ASK_KITCHEN",
    label: "اسأل المطبخ",
    hint: "تواصل مع المطبخ لمعرفة إمكانية وموعد الاستلام أو التوصيل",
  },
];

export function isOrderReadinessValue(
  value: string,
): value is OrderReadinessValue {
  return ORDER_READINESS_VALUES.includes(value as OrderReadinessValue);
}

export function getOrderReadinessLabel(value: string | null | undefined): string {
  const match = ORDER_READINESS_OPTIONS.find((option) => option.id === value);
  return match?.label ?? ORDER_READINESS_OPTIONS[0].label;
}

export function parseOrderReadiness(
  value: string | null | undefined,
): OrderReadinessValue {
  if (value && isOrderReadinessValue(value)) {
    return value;
  }
  return "AVAILABLE_NOW";
}
