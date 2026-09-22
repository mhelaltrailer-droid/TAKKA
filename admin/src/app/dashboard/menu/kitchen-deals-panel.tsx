"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { UploadField } from "@/components/upload-field";
import { PageSkeleton } from "@/components/ui/skeleton";
import { confirmDestructive } from "@/lib/confirm-destructive";
import type { FoodCategoryDef } from "@/lib/food-categories";

type MenuOption = {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string;
  basePrice: number;
  discountedPrice?: number | null;
  depositAmount?: number;
  imageUrl?: string | null;
  approvalStatus: string;
  isAvailable: boolean;
  draftStatus?: string | null;
};

function catalogOfferDefault(item: MenuOption) {
  if (
    item.discountedPrice != null &&
    item.discountedPrice > 0 &&
    item.discountedPrice < item.basePrice
  ) {
    return item.discountedPrice;
  }
  return item.basePrice;
}

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

function statusLabel(item: MenuOption) {
  if (item.approvalStatus === "PENDING") return "بانتظار الاعتماد";
  if (item.approvalStatus === "REJECTED") return "مرفوض";
  if (item.draftStatus === "PENDING") return "تعديل بانتظار الاعتماد";
  return item.isAvailable ? "ظاهر في المنيو" : "مخفي عن المنيو";
}

export function KitchenDealsPanel({
  menuItems: initialItems,
  foodCategories,
}: {
  menuItems: MenuOption[];
  foodCategories: FoodCategoryDef[];
}) {
  const [items, setItems] = useState<MenuOption[]>(initialItems);
  const [dish, setDish] = useState<DishOfTheDay | null>(null);
  const [flash, setFlash] = useState<FlashOffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [dishItemId, setDishItemId] = useState("");
  const [dishPrice, setDishPrice] = useState("");
  const [dishQty, setDishQty] = useState("");

  const [flashItemId, setFlashItemId] = useState("");
  const [flashPrice, setFlashPrice] = useState("");
  const [flashQty, setFlashQty] = useState("10");
  const [flashHours, setFlashHours] = useState<"1" | "2">("1");

  const [showCreate, setShowCreate] = useState(false);
  const [editItemId, setEditItemId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("meals");
  const [formBasePrice, setFormBasePrice] = useState("");
  const [formDiscountedPrice, setFormDiscountedPrice] = useState("");
  const [formDeposit, setFormDeposit] = useState("0");
  const [formImageUrl, setFormImageUrl] = useState("");

  const countdown = useCountdown(flash?.endsAt ?? null);

  const approved = items.filter((item) => item.approvalStatus === "APPROVED");
  const pending = items.filter((item) => item.approvalStatus === "PENDING");

  const loadMenu = useCallback(async () => {
    const res = await fetch("/api/kitchen/menu-items");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "تعذر تحميل المنيو");
    const mapped = (json.menuItems as Array<Record<string, unknown>>).map(
      (item) => ({
        id: String(item.id),
        name: String(item.name ?? ""),
        description: (item.description as string | null) ?? null,
        categoryId: String(item.categoryId ?? "meals"),
        basePrice: Number(item.basePrice ?? 0),
        discountedPrice:
          item.discountedPrice != null ? Number(item.discountedPrice) : null,
        depositAmount: Number(item.depositAmount ?? 0),
        imageUrl: (item.imageUrl as string | null) ?? null,
        approvalStatus: String(item.approvalStatus ?? "PENDING"),
        isAvailable: item.isAvailable === true,
        draftStatus: (item.draftStatus as string | null) ?? null,
      }),
    );
    setItems(mapped);
    return mapped;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    await loadMenu();
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
  }, [loadMenu]);

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

  function fillEditForm(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    setEditItemId(item.id);
    setFormName(item.name);
    setFormDescription(item.description ?? "");
    setFormCategoryId(item.categoryId ?? "meals");
    setFormBasePrice(String(item.basePrice));
    setFormDiscountedPrice(
      item.discountedPrice != null ? String(item.discountedPrice) : "",
    );
    setFormDeposit(String(item.depositAmount ?? 0));
    setFormImageUrl(item.imageUrl ?? "");
    setShowCreate(false);
  }

  function resetItemForm() {
    setEditItemId("");
    setFormName("");
    setFormDescription("");
    setFormCategoryId("meals");
    setFormBasePrice("");
    setFormDiscountedPrice("");
    setFormDeposit("0");
    setFormImageUrl("");
  }

  async function createHiddenItem(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const res = await fetch("/api/kitchen/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        description: formDescription,
        categoryId: formCategoryId,
        orderReadiness: "AVAILABLE_NOW",
        basePrice: Number(formBasePrice),
        discountedPrice: formDiscountedPrice
          ? Number(formDiscountedPrice)
          : null,
        depositAmount: Number(formDeposit),
        imageUrl: formImageUrl || undefined,
        startHidden: true,
        sizes: [],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "تعذر إضافة الصنف");
      return;
    }
    setInfo(
      "تم حفظ الصنف مخفيًا وإرساله للاعتماد. بعد الاعتماد يمكنك تعيينه كطبق يوم أو عرض سريع.",
    );
    resetItemForm();
    setShowCreate(false);
    await refresh();
  }

  async function saveItemEdits(event: React.FormEvent) {
    event.preventDefault();
    if (!editItemId) return;
    setError(null);
    setInfo(null);
    const res = await fetch("/api/kitchen/menu-items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editItemId,
        name: formName,
        description: formDescription,
        categoryId: formCategoryId,
        orderReadiness: "AVAILABLE_NOW",
        basePrice: Number(formBasePrice),
        discountedPrice: formDiscountedPrice
          ? Number(formDiscountedPrice)
          : null,
        depositAmount: Number(formDeposit),
        imageUrl: formImageUrl || undefined,
        sizes: [],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "تعذر حفظ التعديل");
      return;
    }
    setInfo(
      "تم إرسال التعديل للاعتماد. النسخة الحالية تبقى كما هي حتى يعتمد الأدمن.",
    );
    resetItemForm();
    await refresh();
  }

  async function toggleVisibility(item: MenuOption) {
    setError(null);
    const res = await fetch(`/api/kitchen/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        (json as { error?: string }).error || "تعذر تحديث ظهور الصنف",
      );
      return;
    }
    await refresh();
  }

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
    if (
      !confirmDestructive(
        "هل أنت متأكد من إنهاء العرض الفلاش الآن؟ لا يمكن التراجع.",
      )
    ) {
      return;
    }
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
        <PageSkeleton variant="form" />
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">طبق اليوم والعروض السريعة</h2>
        <p className="mt-1 text-sm leading-7 text-zinc-600">
          اختر صنفًا معتمدًا (ظاهر أو مخفي)، أو أضف صنفًا جديدًا يُحفظ مخفيًا
          ويُرسل للاعتماد. يمكنك تعديل التفاصيل قبل التعيين — التعديل يمر
          باعتماد الإدارة.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            resetItemForm();
            setShowCreate(true);
          }}
          className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          إضافة صنف جديد للعروض
        </button>
        {editItemId || showCreate ? (
          <button
            type="button"
            onClick={() => {
              resetItemForm();
              setShowCreate(false);
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            إلغاء النموذج
          </button>
        ) : null}
      </div>

      {(showCreate || editItemId) && (
        <form
          onSubmit={showCreate ? createHiddenItem : saveItemEdits}
          className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <h3 className="font-semibold">
            {showCreate
              ? "صنف جديد (مخفي + بانتظار الاعتماد)"
              : "تعديل تفاصيل الصنف"}
          </h3>
          <input
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="اسم الصنف"
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
          />
          <textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="الوصف"
            rows={3}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
          />
          <select
            required
            value={formCategoryId}
            onChange={(e) => setFormCategoryId(e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
          >
            {foodCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.thumb} {category.label}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={formBasePrice}
              onChange={(e) => setFormBasePrice(e.target.value)}
              placeholder="السعر الأساسي"
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formDiscountedPrice}
              onChange={(e) => setFormDiscountedPrice(e.target.value)}
              placeholder="السعر بعد الخصم (اختياري)"
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={formDeposit}
              onChange={(e) => setFormDeposit(e.target.value)}
              placeholder="العربون"
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
            />
          </div>
          <UploadField
            endpoint="menuItemImage"
            label="صورة الصنف"
            includeHiddenInput={false}
            defaultValue={formImageUrl || null}
            onUploaded={(url) => setFormImageUrl(url)}
          />
          <SubmitButton
            label={showCreate ? "حفظ وإرسال للاعتماد" : "حفظ التعديل للاعتماد"}
            pendingLabel="جارٍ الحفظ..."
          />
        </form>
      )}

      <div className="rounded-2xl border border-zinc-200 p-4">
        <h3 className="font-semibold">أصناف المطبخ</h3>
        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">لا توجد أصناف بعد.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {item.name} ·{" "}
                    {item.discountedPrice != null
                      ? `${formatMoney(item.discountedPrice)} (كان ${formatMoney(item.basePrice)})`
                      : formatMoney(item.basePrice)}
                  </p>
                  <p className="text-xs text-zinc-500">{statusLabel(item)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillEditForm(item.id)}
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium"
                  >
                    تعديل
                  </button>
                  {item.approvalStatus === "APPROVED" ? (
                    <button
                      type="button"
                      onClick={() => toggleVisibility(item)}
                      className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      {item.isAvailable ? "إخفاء" : "إظهار في المنيو"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
        {pending.length > 0 ? (
          <p className="mt-3 text-xs text-amber-700">
            أصناف بانتظار الاعتماد لا يمكن تعيينها كطبق يوم أو عرض حتى تُعتمد.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">طبق اليوم</h3>
          {dish ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              النشط: <strong>{dish.name}</strong> —{" "}
              {formatMoney(dish.dishOfTheDayPrice)} (بدل{" "}
              {formatMoney(dish.basePrice)})
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
              onChange={(e) => {
                const id = e.target.value;
                setDishItemId(id);
                const item = items.find((entry) => entry.id === id);
                if (item) {
                  setDishPrice(String(catalogOfferDefault(item)));
                }
              }}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
            >
              <option value="" disabled>
                اختر صنفًا معتمدًا
              </option>
              {approved.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (
                  {item.discountedPrice != null
                    ? formatMoney(item.discountedPrice)
                    : formatMoney(item.basePrice)}
                  )
                  {item.isAvailable ? "" : " · مخفي"}
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
          <h3 className="text-lg font-semibold">عرض سريع</h3>
          {flash ? (
            <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-950">
              <p>
                النشط: <strong>{flash.itemName}</strong> —{" "}
                {formatMoney(flash.offerPrice)} (بدل{" "}
                {formatMoney(flash.basePrice)})
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
                onChange={(e) => {
                  const id = e.target.value;
                  setFlashItemId(id);
                  const item = items.find((entry) => entry.id === id);
                  if (item) {
                    setFlashPrice(String(catalogOfferDefault(item)));
                  }
                }}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
              >
                <option value="" disabled>
                  اختر صنفًا معتمدًا للعرض
                </option>
                {approved.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (
                    {item.discountedPrice != null
                      ? formatMoney(item.discountedPrice)
                      : formatMoney(item.basePrice)}
                    )
                    {item.isAvailable ? "" : " · مخفي"}
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
              <SubmitButton
                label="بدء العرض السريع"
                pendingLabel="جارٍ الإنشاء..."
              />
            </form>
          )}
        </div>
      </div>

      {info ? (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
