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

function matchesSearch(kitchen: BrowseKitchen, query: string) {
  const q = query.trim();
  if (!q) {
    return true;
  }

  const category = getFoodCategoryByLabel(q);
  if (category) {
    return kitchen.menuItemCategoryIds.includes(category.id);
  }

  const needle = q.toLowerCase();
  if (kitchen.kitchenName.toLowerCase().includes(needle)) {
    return true;
  }
  if (kitchen.description?.toLowerCase().includes(needle)) {
    return true;
  }
  return kitchen.menuItemNames.some((name) =>
    name.toLowerCase().includes(needle),
  );
}

export function KitchensBrowseClient({
  kitchens,
  promos,
  isSignedIn,
}: KitchensBrowseClientProps) {
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!district) {
      return [];
    }
    return kitchens.filter(
      (kitchen) =>
        kitchen.region.regionName === district && matchesSearch(kitchen, search),
    );
  }, [district, kitchens, search]);

  return (
    <>
      <DeliveryLocationHeader onDistrictChange={setDistrict} />

      <label className="mb-5 block">
        <span className="sr-only">ابحث عن مطبخ أو وجبة</span>
        <div className="flex items-center gap-3 rounded-full border border-[#ead9c8] bg-white px-4 py-3 shadow-sm">
          <span className="text-[#6b4a3a]" aria-hidden>
            🔍
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن مطبخ أو وجبة"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#9a7b6a]"
          />
        </div>
      </label>

      <PromoCarousel slides={promos} />

      <FoodCategoriesStrip
        selectedLabel={
          FOOD_CATEGORIES.some((item) => item.label === search.trim())
            ? search.trim()
            : undefined
        }
        onSelect={(label) =>
          setSearch((current) => (current.trim() === label ? "" : label))
        }
      />

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

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#3b2418]">
          {district ? `مطابخ قريبة منك · ${district}` : "مطابخ قريبة منك"}
        </h2>

        {!district ? (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
            اختر الحي من أعلى الصفحة لعرض المطابخ المسجّلة في نفس الحي فقط.
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
            {search.trim()
              ? `لا توجد نتائج لـ «${search.trim()}» في ${district}.`
              : `لا توجد مطابخ مفتوحة في ${district} حاليًا.`}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((kitchen) => (
              <article
                key={kitchen.id}
                className="border border-[#ead9c8] bg-white p-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">
                      {kitchen.kitchenName}
                    </h3>
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
            ))}
          </div>
        )}
      </section>
    </>
  );
}
