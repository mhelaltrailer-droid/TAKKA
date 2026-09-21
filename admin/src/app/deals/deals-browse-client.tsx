"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { DealDish, DealFlash } from "@/components/nearby-deals-strip";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

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

export function DealsBrowseClient() {
  const [dishes, setDishes] = useState<DealDish[]>([]);
  const [flashes, setFlashes] = useState<DealFlash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ cityName: OBOUR_CITY_NAME });
        const res = await fetch(`/api/discovery/deals?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "تعذر تحميل العروض.");
        }
        if (cancelled) return;
        setDishes((json.dishesOfTheDay as DealDish[]) ?? []);
        setFlashes((json.flashOffers as DealFlash[]) ?? []);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : "تعذر تحميل العروض.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const empty = !loading && !error && dishes.length === 0 && flashes.length === 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[#3b2418]">العروض</h1>
        <p className="text-sm leading-7 text-[#6b4a3a]">
          كل عروض Flash وأطباق اليوم من مطابخ {OBOUR_CITY_NAME} المتاحة الآن.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[#6b4a3a]">جارٍ تحميل العروض...</p>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {empty ? (
        <div className="rounded-3xl border border-[#ead9c8] bg-white p-8 text-center">
          <p className="text-lg font-bold text-[#3b2418]">لا توجد عروض الآن</p>
          <p className="mt-2 text-sm leading-7 text-[#6b4a3a]">
            رجّع هنا لاحقًا — المطابخ بتضيف طبق اليوم والعروض السريعة على مدار
            اليوم.
          </p>
          <Link
            href="/kitchens"
            className="mt-5 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            تصفّح المطابخ
          </Link>
        </div>
      ) : null}

      {flashes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#3b2418]">عروض سريعة (Flash)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flashes.map((offer) => (
              <article
                key={`flash-${offer.id}`}
                className="border border-orange-200 bg-orange-50 p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-950">
                    عرض سريع
                  </span>
                  <FlashCountdown endsAt={offer.endsAt} />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[#3b2418]">
                  {offer.itemName}
                </h3>
                <p className="mt-1 text-xs text-[#6b4a3a]">
                  {offer.kitchenName}
                  {offer.regionName ? ` · ${offer.regionName}` : ""}
                </p>
                <p className="mt-3 text-sm">
                  <span className="text-xl font-bold text-orange-900">
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
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-secondary)]"
                  >
                    اطلب الآن
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {dishes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#3b2418]">أطباق اليوم</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((dish) => (
              <article
                key={`dish-${dish.menuItemId}`}
                className="border border-emerald-200 bg-emerald-50 p-5"
              >
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                  طبق اليوم
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#3b2418]">
                  {dish.name}
                </h3>
                <p className="mt-1 text-xs text-[#6b4a3a]">
                  {dish.kitchenName}
                  {dish.regionName ? ` · ${dish.regionName}` : ""}
                </p>
                <p className="mt-3 text-sm">
                  <span className="text-xl font-bold text-emerald-900">
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
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-secondary)]"
                  >
                    اطلب الآن
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
