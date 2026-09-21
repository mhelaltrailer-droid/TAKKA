"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type DealDish = {
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  dishOfTheDayPrice: number;
  dishOfTheDayQty: number | null;
  kitchenId: string;
  kitchenName?: string;
  kitchenSlug?: string;
  regionName?: string;
};

export type DealFlash = {
  id: string;
  menuItemId: string;
  itemName: string;
  imageUrl: string | null;
  basePrice: number;
  offerPrice: number;
  quantityLeft: number;
  endsAt: string;
  kitchenId: string;
  kitchenName?: string;
  kitchenSlug?: string;
  regionName?: string;
};

function useCountdown(endsAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return useMemo(() => {
    const ms = new Date(endsAt).getTime() - now;
    if (ms <= 0) return "انتهى";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [endsAt, now]);
}

function FlashCountdown({ endsAt }: { endsAt: string }) {
  const label = useCountdown(endsAt);
  return (
    <span className="font-mono text-xs font-semibold text-orange-800">
      ⏱ {label}
    </span>
  );
}

export function NearbyDealsStrip({
  district,
}: {
  district: string;
}) {
  const [dishes, setDishes] = useState<DealDish[]>([]);
  const [flashes, setFlashes] = useState<DealFlash[]>([]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ cityName: "مدينة العبور" });
    if (district.trim()) {
      params.set("regionName", district.trim());
    }

    (async () => {
      try {
        const res = await fetch(`/api/discovery/deals?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setDishes((json.dishesOfTheDay as DealDish[]) ?? []);
        setFlashes((json.flashOffers as DealFlash[]) ?? []);
      } catch {
        // Non-blocking strip
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [district]);

  if (dishes.length === 0 && flashes.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 space-y-4">
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#3b2418]">عروض قريبة</h2>
            <p className="mt-1 text-sm text-[#6b4a3a]">
              طبق اليوم وعروض سريعة من المطابخ
              {district ? ` في ${district}` : " المتاحة"}
            </p>
          </div>
          <Link
            href="/deals"
            className="shrink-0 text-sm font-semibold text-[var(--brand-secondary)]"
          >
            كل العروض
          </Link>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {flashes.map((offer) => (
          <article
            key={`flash-${offer.id}`}
            className="min-w-[240px] max-w-[260px] shrink-0 border border-orange-200 bg-orange-50 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-950">
                عرض سريع
              </span>
              <FlashCountdown endsAt={offer.endsAt} />
            </div>
            <h3 className="mt-3 text-base font-semibold text-[#3b2418]">
              {offer.itemName}
            </h3>
            <p className="mt-1 text-xs text-[#6b4a3a]">
              {offer.kitchenName}
              {offer.regionName ? ` · ${offer.regionName}` : ""}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-lg font-bold text-orange-900">
                {offer.offerPrice.toFixed(0)} ج
              </span>{" "}
              <span className="text-xs text-[#9a7b6a] line-through">
                {offer.basePrice.toFixed(0)} ج
              </span>
            </p>
            <p className="mt-1 text-xs text-orange-900">
              متبقي {offer.quantityLeft}
            </p>
            {offer.kitchenSlug ? (
              <Link
                href={`/kitchens/${offer.kitchenSlug}`}
                className="mt-3 inline-flex text-sm font-semibold text-[var(--brand-secondary)]"
              >
                اطلب الآن
              </Link>
            ) : null}
          </article>
        ))}

        {dishes.map((dish) => (
          <article
            key={`dish-${dish.menuItemId}`}
            className="min-w-[240px] max-w-[260px] shrink-0 border border-emerald-200 bg-emerald-50 p-4"
          >
            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
              طبق اليوم
            </span>
            <h3 className="mt-3 text-base font-semibold text-[#3b2418]">
              {dish.name}
            </h3>
            <p className="mt-1 text-xs text-[#6b4a3a]">
              {dish.kitchenName}
              {dish.regionName ? ` · ${dish.regionName}` : ""}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-lg font-bold text-emerald-900">
                {dish.dishOfTheDayPrice.toFixed(0)} ج
              </span>{" "}
              <span className="text-xs text-[#9a7b6a] line-through">
                {dish.basePrice.toFixed(0)} ج
              </span>
            </p>
            {dish.dishOfTheDayQty != null ? (
              <p className="mt-1 text-xs text-emerald-900">
                متبقي {dish.dishOfTheDayQty}
              </p>
            ) : null}
            {dish.kitchenSlug ? (
              <Link
                href={`/kitchens/${dish.kitchenSlug}`}
                className="mt-3 inline-flex text-sm font-semibold text-[var(--brand-secondary)]"
              >
                اطلب الآن
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
