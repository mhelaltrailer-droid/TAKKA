/** Categories for home "تاكل ايه؟" strip — keep in sync with Flutter. */
export type FoodCategory = {
  id: string;
  label: string;
  /** Small visual cue (emoji) used as temporary thumbnail */
  thumb: string;
  /** Search keywords used when the chip is tapped */
  keywords: string[];
};

export const FOOD_CATEGORIES: FoodCategory[] = [
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

export function isFoodCategoryId(value: string): boolean {
  return FOOD_CATEGORIES.some((category) => category.id === value);
}

export function getFoodCategoryById(id: string): FoodCategory | undefined {
  return FOOD_CATEGORIES.find((category) => category.id === id);
}

export function getFoodCategoryByLabel(label: string): FoodCategory | undefined {
  return FOOD_CATEGORIES.find((category) => category.label === label.trim());
}
