"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MenuItemSize = {
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
  sizes: MenuItemSize[];
};

type CustomerAddress = {
  id: string;
  label: string;
  addressLine: string;
  region: {
    cityName: string;
    regionName: string;
  };
};

type CustomerOrderFormProps = {
  kitchenId: string;
  menuItems: MenuItem[];
  addresses: CustomerAddress[];
};

export function CustomerOrderForm({
  kitchenId,
  menuItems,
  addresses,
}: CustomerOrderFormProps) {
  const router = useRouter();
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses[0]?.id ?? "",
  );
  const [customerNotes, setCustomerNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  const orderSummary = useMemo(() => {
    let subtotal = 0;
    let deposit = 0;

    for (const item of menuItems) {
      const quantity = quantities[item.id] ?? 0;

      if (!quantity) {
        continue;
      }

      const chosenSize = item.sizes.find(
        (size) => size.id === selectedSizes[item.id],
      );

      const price = Number(chosenSize?.price ?? item.basePrice);
      const depositAmount = Number(
        chosenSize?.depositAmount ?? item.depositAmount,
      );

      subtotal += price * quantity;
      deposit += depositAmount * quantity;
    }

    return {
      subtotal,
      deposit,
    };
  }, [menuItems, quantities, selectedSizes]);

  async function submitOrder() {
    setLoading(true);
    setError(null);

    try {
      const items = menuItems
        .map((item) => {
          const quantity = quantities[item.id] ?? 0;

          if (!quantity) {
            return null;
          }

          const payload: {
            menuItemId: string;
            quantity: number;
            menuItemSizeId?: string;
          } = {
            menuItemId: item.id,
            quantity,
          };

          if (selectedSizes[item.id]) {
            payload.menuItemSizeId = selectedSizes[item.id];
          }

          return payload;
        })
        .filter(Boolean);

      if (!items.length) {
        throw new Error("اختر صنفًا واحدًا على الأقل قبل إرسال الطلب.");
      }

      if (deliveryType === "delivery" && !selectedAddressId) {
        throw new Error("اختر عنوانًا للتوصيل أولًا.");
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kitchenId,
          deliveryType,
          customerAddressId:
            deliveryType === "delivery" ? selectedAddressId : undefined,
          customerNotes,
          items,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء الطلب.");
      }

      router.push(`/orders/${result.orderId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر إنشاء الطلب.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">اختيار الأصناف</h2>
        <div className="mt-5 space-y-4">
          {menuItems.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-200 p-4"
            >
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm leading-7 text-zinc-600">
                    {item.description || "لا يوجد وصف للصنف."}
                  </p>
                </div>

                <div className="text-sm text-zinc-700">
                  <p>السعر الأساسي: {item.basePrice} جنيه</p>
                  <p>العربون: {item.depositAmount} جنيه</p>
                </div>

                {item.sizes.length ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      اختر الحجم
                    </label>
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

                <div className="space-y-2">
                  <label className="block text-sm font-medium">الكمية</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantities[item.id] ?? 0}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [item.id]: Number(event.target.value || 0),
                      }))
                    }
                    className="w-32 rounded-xl border border-zinc-300 px-3 py-2 outline-none"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">مراجعة الطلب</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <p>المجموع المبدئي: {orderSummary.subtotal.toFixed(2)} جنيه</p>
            <p>العربون المتوقع: {orderSummary.deposit.toFixed(2)} جنيه</p>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">طريقة الاستلام</h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={deliveryType === "pickup"}
                onChange={() => setDeliveryType("pickup")}
              />
              استلام من المطبخ
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={deliveryType === "delivery"}
                onChange={() => setDeliveryType("delivery")}
              />
              توصيل
            </label>
          </div>

          {deliveryType === "delivery" ? (
            <div className="mt-5 space-y-2">
              <label className="block text-sm font-medium">اختر العنوان</label>
              <select
                value={selectedAddressId}
                onChange={(event) => setSelectedAddressId(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none"
              >
                <option value="">اختر عنوانًا</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} - {address.region.cityName} -{" "}
                    {address.region.regionName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">ملاحظات إضافية</h2>
          <textarea
            rows={4}
            value={customerNotes}
            onChange={(event) => setCustomerNotes(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            placeholder="أي تفاصيل إضافية للطلب..."
          />
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={submitOrder}
          disabled={loading}
          className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "جارٍ إرسال الطلب..." : "إرسال الطلب"}
        </button>
      </aside>
    </div>
  );
}
