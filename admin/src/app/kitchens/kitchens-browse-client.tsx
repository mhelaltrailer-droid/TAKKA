"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { DeliveryLocationHeader } from "@/components/delivery-location-header";
import { FoodCategoriesStrip } from "@/components/food-categories-strip";
import {
  PromoCarousel,
  type PromoSlide,
} from "@/components/promo-carousel";
import { NearbyDealsStrip } from "@/components/nearby-deals-strip";
import { FOOD_CATEGORIES, getFoodCategoryByLabel } from "@/lib/food-categories";
import {
  getNearbyDistrictNames,
  kitchenMatchesAnyDistrict,
  kitchenMatchesDistrict,
} from "@/lib/obour-nearby-districts";

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

function withCategory(kitchens: BrowseKitchen[], categoryLabel: string) {
  if (!categoryLabel) {
    return kitchens;
  }
  return kitchens.filter((kitchen) => matchesCategory(kitchen, categoryLabel));
}

/**
 * Cascade: selected district → adjacent districts → city-wide.
 * No explanatory banners — just return the kitchens to show.
 */
function resolveDiscoveryKitchens(
  kitchens: BrowseKitchen[],
  district: string,
  categoryLabel: string,
): BrowseKitchen[] {
  const scoped = withCategory(kitchens, categoryLabel);

  if (!district) {
    return scoped;
  }

  const inDistrict = scoped.filter((kitchen) =>
    kitchenMatchesDistrict(kitchen.region.regionName, district),
  );
  if (inDistrict.length > 0) {
    return inDistrict;
  }

  const adjacentNames = getNearbyDistrictNames(district);
  if (adjacentNames.length > 0) {
    const adjacent = scoped.filter((kitchen) =>
      kitchenMatchesAnyDistrict(kitchen.region.regionName, adjacentNames),
    );
    if (adjacent.length > 0) {
      return adjacent;
    }
  }

  return scoped;
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

function KitchenGrid({ kitchens }: { kitchens: BrowseKitchen[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {kitchens.map((kitchen) => (
        <KitchenCard key={kitchen.id} kitchen={kitchen} />
      ))}
    </div>
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

  const discoveryKitchens = useMemo(
    () => resolveDiscoveryKitchens(kitchens, district, categoryLabel),
    [categoryLabel, district, kitchens],
  );

  const allKitchens = useMemo(() => {
    return kitchens.filter((kitchen) => matchesTextSearch(kitchen, search));
  }, [kitchens, search]);

  function scrollToAllKitchens() {
    document
      .getElementById("all-kitchens")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <DeliveryLocationHeader onDistrictChange={setDistrict} />

      <PromoCarousel slides={promos} />

      <Link
        href="/deals"
        className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-orange-300 bg-gradient-to-l from-orange-50 to-emerald-50 px-4 py-4 text-right transition hover:border-orange-400"
      >
        <span>
          <span className="block text-base font-bold text-[#3b2418]">
            🔥 العروض
          </span>
          <span className="mt-1 block text-sm text-[#6b4a3a]">
            كل Flash وأطباق اليوم في مدينة العبور
          </span>
        </span>
        <span className="text-xl text-[#e67e22]" aria-hidden>
          ‹
        </span>
      </Link>

      <NearbyDealsStrip district={district} />

      {!isSignedIn ? (
        <p className="mb-6 text-sm leading-7 text-[#6b4a3a]">
          تصفّح كزائر: المطابخ والأصناف والأسعار فقط.{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-[var(--brand-primary)] underline underline-offset-4"
          >
            سجل الآن
          </Link>{" "}
          لإتمام الطلب أو أي خطوة أخرى.
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
          {!district
            ? categoryLabel
              ? `المطابخ المتاحة · ${categoryLabel}`
              : "المطابخ المتاحة"
            : categoryLabel
              ? `مطابخ قريبة · ${district} · ${categoryLabel}`
              : `مطابخ قريبة منك · ${district}`}
        </h2>

        {!district ? (
          <div className="space-y-4">
            <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
              <p className="font-semibold text-[#3b2418]">اختر الحي</p>
              <p className="mt-2">
                لم تختر حيًا بعد — نعرض كل المطابخ المتاحة. اختر الحي من أعلى
                الصفحة لتصفية «مطابخ قريبة منك».
              </p>
              <button
                type="button"
                onClick={scrollToAllKitchens}
                className="mt-4 inline-flex rounded-full border border-[#ead9c8] bg-[#fff8f1] px-4 py-2 text-sm font-semibold text-[#4a2e22]"
              >
                استعراض كل المطابخ
              </button>
            </div>
            {discoveryKitchens.length > 0 ? (
              <KitchenGrid kitchens={discoveryKitchens} />
            ) : (
              <div className="border border-[#ead9c8] bg-white p-6 text-sm text-[#6b4a3a]">
                لا توجد مطابخ متاحة حاليًا.
              </div>
            )}
          </div>
        ) : discoveryKitchens.length > 0 ? (
          <KitchenGrid kitchens={discoveryKitchens} />
        ) : (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm text-[#6b4a3a]">
            لا توجد مطابخ متاحة حاليًا.
          </div>
        )}
      </section>

      <section id="all-kitchens" className="space-y-4">
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
          <KitchenGrid kitchens={allKitchens} />
        )}
      </section>
    </>
  );
}
