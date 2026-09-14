"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ORDER_READINESS_CUSTOMER_QUESTION,
  getOrderReadinessLabel,
} from "@/lib/order-readiness";
import {
  addWebCartItem,
  getWebCart,
  subscribeWebCart,
  webCartTotals,
} from "@/lib/web-cart";

function FlashEndsAt({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState("...");
  useEffect(() => {
    function tick() {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("انتهى العرض");
        return;
      }
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setLabel(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`,
      );
    }
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  return (
    <p className="font-mono text-xs font-semibold text-orange-800">
      ينتهي خلال {label}
    </p>
  );
}

type MenuSize = {
  id: string;
  sizeName: string;
  price: string;
  depositAmount: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  depositAmount: string;
  orderReadiness: string;
  isDishOfTheDay?: boolean;
  dishOfTheDayPrice?: string | null;
  dishOfTheDayQty?: number | null;
  flashOfferPrice?: string | null;
  flashOfferEndsAt?: string | null;
  flashQuantityLeft?: number | null;
  sizes: MenuSize[];
};

export function KitchenMenuCart({
  kitchenId,
  kitchenName,
  kitchenSlug,
  kitchenLatitude,
  kitchenLongitude,
  kitchenAddressLine,
  kitchenRegionLabel,
  menuItems,
}: {
  kitchenId: string;
  kitchenName: string;
  kitchenSlug: string;
  kitchenLatitude?: number | null;
  kitchenLongitude?: number | null;
  kitchenAddressLine?: string | null;
  kitchenRegionLabel?: string | null;
  menuItems: MenuItem[];
}) {
  const [cartCount, setCartCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    function sync() {
      const cart = getWebCart();
      setCartCount(webCartTotals(cart.items).count);
    }
    sync();
    return subscribeWebCart(sync);
  }, []);

  function dealUnitPrice(item: MenuItem) {
    if (item.flashOfferPrice) {
      return Number(item.flashOfferPrice);
    }
    if (item.isDishOfTheDay && item.dishOfTheDayPrice) {
      return Number(item.dishOfTheDayPrice);
    }
    return Number(item.basePrice);
  }

  function addItem(item: MenuItem) {
    const sizeId = selectedSizes[item.id] || "";
    const size = item.sizes.find((entry) => entry.id === sizeId);
    try {
      addWebCartItem({
        kitchenId,
        kitchenName,
        kitchenSlug,
        kitchenLatitude,
        kitchenLongitude,
        kitchenAddressLine,
        kitchenRegionLabel,
        item: {
          menuItemId: item.id,
          menuItemName: item.name,
          menuItemSizeId: size?.id ?? null,
          sizeName: size?.sizeName ?? null,
          unitPrice: Number(size?.price ?? dealUnitPrice(item)),
          depositAmount: Number(size?.depositAmount ?? item.depositAmount),
          orderReadiness: item.orderReadiness,
          quantity: 1,
        },
      });
      setMessage(`تمت إضافة «${item.name}» إلى السلة.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر إضافة الصنف للسلة.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">المنيو</h2>
        <Link
          href="/cart"
          className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          السلة{cartCount > 0 ? ` (${cartCount})` : ""}
        </Link>
      </div>

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {menuItems.length === 0 ? (
        <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
          لا توجد أصناف متاحة حاليًا.
        </div>
      ) : (
        menuItems.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-zinc-200 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <div className="flex flex-wrap gap-2">
                {item.flashOfferPrice ? (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-900">
                    عرض سريع
                  </span>
                ) : null}
                {item.isDishOfTheDay ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900">
                    طبق اليوم
                  </span>
                ) : null}
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900">
                  {ORDER_READINESS_CUSTOMER_QUESTION}{" "}
                  {getOrderReadinessLabel(item.orderReadiness)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              {item.description || "لا يوجد وصف للصنف."}
            </p>
            <div className="mt-3 text-sm text-zinc-700">
              {item.flashOfferPrice ||
              (item.isDishOfTheDay && item.dishOfTheDayPrice) ? (
                <p>
                  السعر:{" "}
                  <strong>
                    {item.flashOfferPrice ?? item.dishOfTheDayPrice} جنيه
                  </strong>{" "}
                  <span className="text-zinc-400 line-through">
                    {item.basePrice} جنيه
                  </span>
                </p>
              ) : (
                <p>السعر: {item.basePrice} جنيه</p>
              )}
              <p>العربون: {item.depositAmount} جنيه</p>
              {item.flashOfferEndsAt ? (
                <FlashEndsAt endsAt={item.flashOfferEndsAt} />
              ) : null}
              {item.flashQuantityLeft != null ? (
                <p className="text-xs text-orange-800">
                  متبقي من العرض: {item.flashQuantityLeft}
                </p>
              ) : null}
              {item.isDishOfTheDay && item.dishOfTheDayQty != null ? (
                <p className="text-xs text-emerald-800">
                  متبقي من طبق اليوم: {item.dishOfTheDayQty}
                </p>
              ) : null}
            </div>
            {item.sizes.length ? (
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium">اختر الحجم</label>
                <select
                  value={selectedSizes[item.id] ?? ""}
                  onChange={(event) =>
                    setSelectedSizes((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none"
                >
                  <option value="">السعر الأساسي</option>
                  {item.sizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.sizeName} - {size.price} جنيه
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => addItem(item)}
              className="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              إضافة للسلة
            </button>
          </article>
        ))
      )}
    </div>
  );
}
