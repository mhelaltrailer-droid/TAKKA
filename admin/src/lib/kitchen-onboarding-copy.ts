/** Shared Arabic copy for kitchen onboarding — keep in sync with Flutter. */

export const KITCHEN_ONBOARDING_STEPS = [
  { id: 1, title: "بيانات المطبخ والحي" },
  { id: 2, title: "الصور" },
  { id: 3, title: "الدفع والهوية" },
  { id: 4, title: "مراجعة وإرسال" },
] as const;

export const KITCHEN_UPLOAD_CRITERIA = {
  logo: "صورة مربعة واضحة لشعار المطبخ، خلفية بسيطة، وحجم مناسب للعرض.",
  cover:
    "صورة أفقية واضحة تعبر عن المطبخ أو أشهر الأصناف، بدون نصوص كثيرة.",
  nationalId:
    "صورة واضحة لوجه البطاقة بالكامل بدون قص، بإضاءة جيدة. للاعتماد فقط ولا تظهر للعملاء.",
} as const;

export const KITCHEN_ONBOARDING_DRAFT_KEY = "takka_kitchen_onboarding_draft";
