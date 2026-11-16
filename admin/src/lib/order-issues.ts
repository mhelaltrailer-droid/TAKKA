import type { OrderIssueType } from "@prisma/client";

export const ORDER_ISSUE_OPTIONS: Array<{
  type: OrderIssueType;
  label: string;
}> = [
  { type: "COLD_FOOD", label: "الأكل وصل بارد" },
  { type: "MISSING_ITEM", label: "ناقص صنف" },
  { type: "LATE", label: "اتأخر" },
  { type: "DEPOSIT", label: "مشكلة في العربون" },
  { type: "OTHER", label: "حاجة تانية" },
];

const LABELS = new Map(
  ORDER_ISSUE_OPTIONS.map((option) => [option.type, option.label]),
);

export function isOrderIssueType(value: string): value is OrderIssueType {
  return LABELS.has(value as OrderIssueType);
}

export function orderIssueTypeLabel(type: OrderIssueType | string): string {
  return LABELS.get(type as OrderIssueType) ?? "حاجة تانية";
}
