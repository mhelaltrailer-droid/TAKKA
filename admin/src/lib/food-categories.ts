/** Default categories for home "تاكل ايه؟" — seed + offline fallback. Keep in sync with Flutter defaults. */
export type FoodCategoryDef = {
  id: string;
  label: string;
  /** Small visual cue (emoji) used as temporary thumbnail */
  thumb: string;
  /** Search keywords used when the chip is tapped */
  keywords: string[];
};

/** @deprecated Prefer FoodCategoryDef — kept for existing imports. */
export type FoodCategory = FoodCategoryDef;

export const DEFAULT_FOOD_CATEGORIES: FoodCategoryDef[] = [
  { id: "bakery", label: "مخبوزات", thumb: "🥖", keywords: ["مخبوزات", "عيش", "فطير"] },
  { id: "poultry", label: "طيور", thumb: "🍗", keywords: ["طيور", "فراخ", "دجاج"] },
  { id: "soups", label: "شوربات", thumb: "🍲", keywords: ["شوربة", "شوربات"] },
  { id: "grills", label: "مشويات", thumb: "🥩", keywords: ["مشويات", "كفتة", "شيش"] },
  { id: "mahshi", label: "محاشي", thumb: "🫑", keywords: ["محاشي", "محشي"] },
  { id: "seafood", label: "أسماك", thumb: "🦐", keywords: ["أسماك", "سمك", "جمبري"] },
  { id: "musammat", label: "مسمط", thumb: "🦴", keywords: ["مسمط"] },
  { id: "pasta", label: "مكرونات", thumb: "🍝", keywords: ["مكرونة", "مكرونات", "باستا"] },
  { id: "stew", label: "طبيخ", thumb: "🥘", keywords: ["طبيخ"] },
  { id: "breakfast", label: "فطار", thumb: "🍳", keywords: ["فطار", "فول", "بيض"] },
  { id: "tagine", label: "طواجن", thumb: "🫕", keywords: ["طاجن", "طواجن"] },
  { id: "popular", label: "شعبيات", thumb: "🥙", keywords: ["شعبيات", "كشري"] },
  { id: "appetizers", label: "مقبلات", thumb: "🥒", keywords: ["مقبلات"] },
  { id: "savory", label: "مملحات", thumb: "🐟", keywords: ["مملحات"] },
  { id: "candy", label: "حلويات", thumb: "🍯", keywords: ["حلويات", "حلو"] },
  { id: "dairy", label: "ألبان", thumb: "🧀", keywords: ["ألبان", "جبن"] },
  { id: "dessert", label: "تحلية", thumb: "🍮", keywords: ["تحلية", "حلى"] },
  { id: "salads", label: "سلطات", thumb: "🥗", keywords: ["سلطات", "سلطة"] },
  { id: "drinks", label: "مشروبات", thumb: "🥤", keywords: ["مشروبات", "عصير"] },
  { id: "chocolate", label: "شوكولاته", thumb: "🍩", keywords: ["شوكولاتة", "شوكولاته"] },
  { id: "meals", label: "وجبات", thumb: "🍱", keywords: ["وجبات", "وجبة"] },
  { id: "healthy", label: "هيلثي", thumb: "🥗", keywords: ["هيلثي", "صحي"] },
  { id: "cake", label: "كيك", thumb: "🎂", keywords: ["كيك", "تورتة"] },
];

/** Static fallback alias — prefer listActiveFoodCategories() / discovery API at runtime. */
export const FOOD_CATEGORIES = DEFAULT_FOOD_CATEGORIES;

export function isFoodCategoryId(value: string): boolean {
  return DEFAULT_FOOD_CATEGORIES.some((category) => category.id === value);
}

export function getFoodCategoryById(id: string): FoodCategoryDef | undefined {
  return DEFAULT_FOOD_CATEGORIES.find((category) => category.id === id);
}

export function getFoodCategoryByLabel(label: string): FoodCategoryDef | undefined {
  return DEFAULT_FOOD_CATEGORIES.find((category) => category.label === label.trim());
}
