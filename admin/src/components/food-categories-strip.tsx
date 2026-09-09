"use client";

import { FOOD_CATEGORIES } from "@/lib/food-categories";

type FoodCategoriesStripProps = {
  selectedLabel?: string;
  onSelect: (label: string) => void;
};

export function FoodCategoriesStrip({
  selectedLabel,
  onSelect,
}: FoodCategoriesStripProps) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-xl font-bold text-[#3b2418]">تاكل ايه؟</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FOOD_CATEGORIES.map((category) => {
          const selected = selectedLabel === category.label;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.label)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[#3b2418]"
                  : "border-[#ead9c8] bg-white text-[#3b2418] hover:bg-[#fff8f1]"
              }`}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4ea] text-lg"
                aria-hidden
              >
                {category.thumb}
              </span>
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
