"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SubmitButton } from "@/components/submit-button";

type MenuOption = {
  id: string;
  name: string;
  basePrice: number;
  approvalStatus: string;
  isAvailable: boolean;
};

type DishOfTheDay = {
  menuItemId: string;
  name: string;
  basePrice: number;
  dishOfTheDayPrice: number;
  dishOfTheDayQty: number | null;
};

type FlashOffer = {
  id: string;
  menuItemId: string;
  itemName: string;
  basePrice: number;
  offerPrice: number;
  quantityLeft: number;
  endsAt: string;
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} جنيه`;
}

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return useMemo(() => {
    if (!endsAt) return null;
    const ms = new Date(endsAt).getTime() - now;
    if (ms <= 0) return "انتهى";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [endsAt, now]);
}

export function KitchenDealsPanel({ menuItems }: { menuItems: MenuOption[] }) {
  const approved = menuItems.filter(
    (item) => item.approvalStatus === "APPROVED" && item.isAvailable,
  );

  const [dish, setDish] = useState<DishOfTheDay | null>(null);
  const [flash, setFlash] = useState<FlashOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [dishItemId, setDishItemId] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishQty, setDishQty] = useState("");

  const [flashItemId, setFlashItemId] = useState("");
  const [flashPrice, setFlashPrice] = useState("");
  const [flashQty, setFlashQty] = useState("10");
  const [flashHours, setFlashHours] = useState<"1" | "2">("1");

  const countdown = useCountdown(flash?.endsAt ?? null);

  const refresh = useCallback(async () => {
    setError(null);
    const [dishRes, flashRes] = await Promise.all([
      fetch("/api/kitchen/dish-of-the-day"),
      fetch("/api/kitchen/flash-offers"),
    ]);
    const dishJson = await dishRes.json();
    const flashJson = await flashRes.json();
    if (!dishRes.ok) throw new Error(dishJson.error || "تعذر تحميل طبق اليوم");
    if (!flashRes.ok) throw new Error(flashJson.error || "تعذر تحميل العرض");
    setDish(dishJson.dishOfTheDay ?? null);
    setFlash(flashJson.activeFlashOffer ?? null);
    if (dishJson.dishOfTheDay) {
      setDishItemId(dishJson.dishOfTheDay.menuItemId);
      setDishPrice(String(dishJson.dishOfTheDay.dishOfTheDayPrice));
      setDishQty(
        dishJson.dishOfTheDay.dishOfTheDayQty != null
          ? String(dishJson.dishOfTheDay.dishOfTheDayQty)
          : "",
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "تعذر التحميل");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function saveDish(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/kitchen/dish-of-the-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId: dishItemId,
        dishOfTheDayPrice: Number(dishPrice),
        dishOfTheDayQty: dishQty.trim() === "" ? null : Number(dishQty),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "تعذر حفظ طبق اليوم");
      return;
    }
    setDish(json.dishOfTheDay ?? null);
  }

  async function clearDish() {
    setError(null);
    const res = await fetch("/api/kitchen/dish-of-the-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "تعذر إلغاء طبق اليوم");
      return;
    }
    setDish(null);
    setDishItemId("");
    setDishPrice("");
    setDishQty("");
  }

  async function createFlash(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/kitchen/flash-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId: flashItemId,
        offerPrice: Number(flashPrice),
        quantity: Number(flashQty),
        durationHours: Number(flashHours),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "تعذر إنشاء العرض");
      return;
    }
    setFlash(json.activeFlashOffer ?? null);
  }

  async function endFlash() {
    if (!flash) return;
    setError(null);
    const res = await fetch(`/api/kitchen/flash-offers/${flash.id}/end`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "تعذر إنهاء العرض");
      return;
    }
    setFlash(null);
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">جارٍ تحميل العروض...</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">طبق اليوم</h2>
          <p className="mt-1 text-sm leading-7 text-zinc-600">
            وجبة موحدة جاهزة للتسليم بسعر أقل، تظهر للعملاء القريبين من حيك.
          </p>
        </div>

        {dish ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            النشط: <strong>{dish.name}</strong> — {formatMoney(dish.dishOfTheDayPrice)}{" "}
            (بدل {formatMoney(dish.basePrice)})
            {dish.dishOfTheDayQty != null
              ? ` · متبقي ${dish.dishOfTheDayQty}`
              : ""}
          </div>
        ) : (
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            لا يوجد طبق يوم مفعّل حاليًا.
          </div>
        )}

        <form onSubmit={saveDish} className="grid gap-3">
          <select
            required
            value={dishItemId}
            onChange={(e) => setDishItemId(e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
          >
            <option value="" disabled>
              اختر صنفًا معتمدًا
            </option>
            {approved.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({formatMoney(item.basePrice)})
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="سعر طبق اليوم"
              value={dishPrice}
              onChange={(e) => setDishPrice(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="الكمية (اختياري)"
              value={dishQty}
              onChange={(e) => setDishQty(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton label="حفظ طبق اليوم" pendingLabel="جارٍ الحفظ..." />
            {dish ? (
              <button
                type="button"
                onClick={clearDish}
                className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium"
              >
                إلغاء طبق اليوم
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">عرض سريع (Flash)</h2>
          <p className="mt-1 text-sm leading-7 text-zinc-600">
            خصم لمدة ساعة أو ساعتين مع عدّاد. ينتهي تلقائيًا أو عند نفاذ الكمية أو
            يدويًا.
          </p>
        </div>

        {flash ? (
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-950">
            <p>
              النشط: <strong>{flash.itemName}</strong> —{" "}
              {formatMoney(flash.offerPrice)} (بدل {formatMoney(flash.basePrice)})
            </p>
            <p className="mt-1">
              متبقي {flash.quantityLeft} · العدّاد:{" "}
              <strong className="font-mono">{countdown}</strong>
            </p>
            <button
              type="button"
              onClick={endFlash}
              className="mt-3 rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-medium"
            >
              إنهاء العرض الآن
            </button>
          </div>
        ) : (
          <form onSubmit={createFlash} className="grid gap-3">
            <select
              required
              value={flashItemId}
              onChange={(e) => setFlashItemId(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
            >
              <option value="" disabled>
                اختر صنفًا للعرض
              </option>
              {approved.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatMoney(item.basePrice)})
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="سعر العرض"
                value={flashPrice}
                onChange={(e) => setFlashPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <input
                required
                type="number"
                min="1"
                step="1"
                placeholder="الكمية"
                value={flashQty}
                onChange={(e) => setFlashQty(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <select
                value={flashHours}
                onChange={(e) => setFlashHours(e.target.value as "1" | "2")}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
              >
                <option value="1">ساعة واحدة</option>
                <option value="2">ساعتان</option>
              </select>
            </div>
            <SubmitButton label="بدء العرض السريع" pendingLabel="جارٍ الإنشاء..." />
          </form>
        )}
      </div>

      {error ? (
        <p className="lg:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {approved.length === 0 ? (
        <p className="lg:col-span-2 text-sm text-zinc-500">
          أضف أصنافًا معتمدة ومتاحة أولًا قبل تعيين طبق اليوم أو عرض سريع.
        </p>
      ) : null}
    </section>
  );
}
