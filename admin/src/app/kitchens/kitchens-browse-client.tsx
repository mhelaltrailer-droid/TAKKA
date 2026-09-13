"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DeliveryLocationHeader } from "@/components/delivery-location-header";
import { FoodCategoriesStrip } from "@/components/food-categories-strip";
import {
  PromoCarousel,
  type PromoSlide,
} from "@/components/promo-carousel";
import { FOOD_CATEGORIES, getFoodCategoryByLabel } from "@/lib/food-categories";

export type BrowseKitchen = {
  id: string;
  slug: string;
  kitchenName: string;
  description: string | null;
  averageRating: number;
  region: {
    cityName: string;
    regionName: string;
  };
  menuItemsCount: number;
  reviewsCount: number;
  menuItemNames: string[];
  menuItemCategoryIds: string[];
};

type KitchensBrowseClientProps = {
  kitchens: BrowseKitchen[];
  promos: PromoSlide[];
  isSignedIn: boolean;
};

function matchesCategory(kitchen: BrowseKitchen, categoryLabel: string) {
  const category = getFoodCategoryByLabel(categoryLabel);
  if (!category) {
    return true;
  }
  return kitchen.menuItemCategoryIds.includes(category.id);
}

function matchesTextSearch(kitchen: BrowseKitchen, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (kitchen.kitchenName.toLowerCase().includes(q)) {
    return true;
  }
  if (kitchen.description?.toLowerCase().includes(q)) {
    return true;
  }
  return kitchen.menuItemNames.some((name) => name.toLowerCase().includes(q));
}

function KitchenCard({ kitchen }: { kitchen: BrowseKitchen }) {
  return (
    <article className="border border-[#ead9c8] bg-white p-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">{kitchen.kitchenName}</h3>
          <span className="bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
            مفتوح
          </span>
        </div>
        <p className="text-sm leading-7 text-[#6b4a3a]">
          {kitchen.description || "لا يوجد وصف للمطبخ بعد."}
        </p>
        {kitchen.menuItemNames.length > 0 ? (
          <p className="text-xs leading-6 text-[#6b4a3a]">
            {kitchen.menuItemNames.slice(0, 4).join(" · ")}
          </p>
        ) : null}
        <div className="text-sm text-[#6b4a3a]">
          <p>
            {kitchen.region.cityName} - {kitchen.region.regionName}
          </p>
          <p>
            التقييم: {kitchen.averageRating.toFixed(1)} | التعليقات:{" "}
            {kitchen.reviewsCount}
          </p>
        </div>
        <Link
          href={`/kitchens/${kitchen.slug}`}
          className="inline-flex bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--brand-secondary)]"
        >
          عرض المطبخ
        </Link>
      </div>
    </article>
  );
}

export function KitchensBrowseClient({
  kitchens,
  promos,
  isSignedIn,
}: KitchensBrowseClientProps) {
  const [district, setDistrict] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [search, setSearch] = useState("");

  const nearbyKitchens = useMemo(() => {
    if (!district) {
      return [];
    }
    return kitchens.filter(
      (kitchen) =>
        kitchen.region.regionName === district &&
        (!categoryLabel || matchesCategory(kitchen, categoryLabel)),
    );
  }, [categoryLabel, district, kitchens]);

  const allKitchens = useMemo(() => {
    return kitchens.filter((kitchen) => matchesTextSearch(kitchen, search));
  }, [kitchens, search]);

  return (
    <>
      <DeliveryLocationHeader onDistrictChange={setDistrict} />

      <PromoCarousel slides={promos} />

      {!isSignedIn ? (
        <p className="mb-6 text-sm leading-7 text-[#6b4a3a]">
          تصفّح بحرية، و{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-[var(--brand-secondary)]"
          >
            أنشئ حسابًا
          </Link>{" "}
          لإتمام الطلب.
        </p>
      ) : null}

      <FoodCategoriesStrip
        selectedLabel={
          FOOD_CATEGORIES.some((item) => item.label === categoryLabel)
            ? categoryLabel
            : undefined
        }
        onSelect={(label) =>
          setCategoryLabel((current) => (current === label ? "" : label))
        }
      />

      <section className="mb-10 space-y-4">
        <h2 className="text-xl font-bold text-[#3b2418]">
          {district
            ? categoryLabel
              ? `مطابخ قريبة · ${district} · ${categoryLabel}`
              : `مطابخ قريبة منك · ${district}`
            : "مطابخ قريبة منك"}
        </h2>

        {!district ? (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
            اختر الحي من أعلى الصفحة لعرض المطابخ القريبة عبر «تاكل ايه؟».
          </div>
        ) : nearbyKitchens.length === 0 ? (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
            {categoryLabel
              ? `لا توجد مطابخ قريبة في ${district} لفئة «${categoryLabel}».`
              : `لا توجد مطابخ مفتوحة في ${district} حاليًا.`}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {nearbyKitchens.map((kitchen) => (
              <KitchenCard key={kitchen.id} kitchen={kitchen} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-bold text-[#3b2418]">استعراض المطابخ</h2>
          <p className="text-sm text-[#6b4a3a]">كل المطابخ المتاحة في العبور</p>
        </div>

        <label className="block">
          <span className="sr-only">ابحث في كل المطابخ</span>
          <div className="flex items-center gap-3 rounded-full border border-[#ead9c8] bg-white px-4 py-3 shadow-sm">
            <span className="text-[#6b4a3a]" aria-hidden>
              🔍
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في كل المطابخ"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a7b6a]"
            />
          </div>
        </label>

        {allKitchens.length === 0 ? (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
            {search.trim()
              ? `لا توجد نتائج لـ «${search.trim()}» ضمن المطابخ المتاحة.`
              : "لا توجد مطابخ متاحة حاليًا."}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {allKitchens.map((kitchen) => (
              <KitchenCard key={kitchen.id} kitchen={kitchen} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
