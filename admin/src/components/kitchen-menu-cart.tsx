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
  sizes: MenuSize[];
};

export function KitchenMenuCart({
  kitchenId,
  kitchenName,
  kitchenSlug,
  menuItems,
}: {
  kitchenId: string;
  kitchenName: string;
  kitchenSlug: string;
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

  function addItem(item: MenuItem) {
    const sizeId = selectedSizes[item.id] || "";
    const size = item.sizes.find((entry) => entry.id === sizeId);
    try {
      addWebCartItem({
        kitchenId,
        kitchenName,
        kitchenSlug,
        item: {
          menuItemId: item.id,
          menuItemName: item.name,
          menuItemSizeId: size?.id ?? null,
          sizeName: size?.sizeName ?? null,
          unitPrice: Number(size?.price ?? item.basePrice),
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
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900">
                {ORDER_READINESS_CUSTOMER_QUESTION}{" "}
                {getOrderReadinessLabel(item.orderReadiness)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              {item.description || "لا يوجد وصف للصنف."}
            </p>
            <div className="mt-3 text-sm text-zinc-700">
              <p>السعر: {item.basePrice} جنيه</p>
              <p>العربون: {item.depositAmount} جنيه</p>
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
