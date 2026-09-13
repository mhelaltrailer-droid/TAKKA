"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { DeliveryCoords } from "@/components/delivery-location-picker";
import {
  ORDER_READINESS_CUSTOMER_QUESTION,
  getOrderReadinessLabel,
} from "@/lib/order-readiness";

const DeliveryLocationPicker = dynamic(
  () =>
    import("@/components/delivery-location-picker").then(
      (mod) => mod.DeliveryLocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-zinc-500">جارٍ تحميل الخريطة...</p>
    ),
  },
);

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
  orderReadiness: string;
  sizes: MenuItemSize[];
};

type CustomerAddress = {
  id: string;
  label: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  region: {
    cityName: string;
    regionName: string;
  };
};

type CustomerOrderFormProps = {
  kitchenId: string;
  menuItems: MenuItem[];
  addresses: CustomerAddress[];
  registeredPhone: string | null;
};

function coordsFromAddress(
  address: CustomerAddress | undefined,
): DeliveryCoords | null {
  if (address?.latitude == null || address?.longitude == null) {
    return null;
  }
  return {
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

export function CustomerOrderForm({
  kitchenId,
  menuItems,
  addresses,
  registeredPhone,
}: CustomerOrderFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialAddress = addresses[0];
  const initialCoords = coordsFromAddress(initialAddress);

  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [selectedAddressId, setSelectedAddressId] = useState(
    initialAddress?.id ?? "",
  );
  const [customerNotes, setCustomerNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState<DeliveryCoords | null>(
    initialCoords,
  );
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(
    Boolean(initialCoords),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {},
  );

  const selectedAddress = addresses.find(
    (address) => address.id === selectedAddressId,
  );

  const locationHint = coordsFromAddress(selectedAddress);
  const addressesReturnHref = `/addresses?returnTo=${encodeURIComponent(pathname)}`;

  function selectAddress(addressId: string) {
    const address = addresses.find((item) => item.id === addressId);
    const nextCoords = coordsFromAddress(address);
    setSelectedAddressId(addressId);
    setDeliveryCoords(nextCoords);
    setDeliveryConfirmed(Boolean(nextCoords));
  }

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
        throw new Error("اختر عنوانًا للتوصيل أو أضف عنوانًا جديدًا.");
      }

      if (deliveryType === "delivery") {
        if (!deliveryCoords || !deliveryConfirmed) {
          throw new Error(
            "ضع دبوس التوصيل على الخريطة واضغط «تأكيد الموقع» قبل الإرسال.",
          );
        }
      }

      if (!registeredPhone) {
        throw new Error(
          "لا يوجد رقم هاتف مسجّل على حسابك. حدّث بيانات الحساب قبل إرسال الطلب.",
        );
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
          customerContactPhone: contactPhone.trim() || undefined,
          deliveryLatitude:
            deliveryType === "delivery" ? deliveryCoords?.latitude : undefined,
          deliveryLongitude:
            deliveryType === "delivery" ? deliveryCoords?.longitude : undefined,
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
                  <p>
                    {ORDER_READINESS_CUSTOMER_QUESTION}{" "}
                    {getOrderReadinessLabel(item.orderReadiness)}
                  </p>
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
            <p className="text-xs text-zinc-500">
              رسوم التوصيل يحددها المطبخ عند القبول، وتظهر منفصلة في ملخص الطلب.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">طريقة الاستلام</h2>
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={deliveryType === "pickup"}
                onChange={() => {
                  setDeliveryType("pickup");
                  setDeliveryCoords(null);
                  setDeliveryConfirmed(false);
                }}
              />
              استلام من المطبخ
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={deliveryType === "delivery"}
                onChange={() => {
                  setDeliveryType("delivery");
                  if (selectedAddressId) {
                    selectAddress(selectedAddressId);
                  }
                }}
              />
              توصيل
            </label>
          </div>

          {deliveryType === "delivery" ? (
            <div className="mt-5 space-y-5">
              {addresses.length === 0 ? (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm leading-7 text-amber-950">
                    لا توجد عناوين محفوظة. أضف عنوان توصيل أولًا ثم أكّد الموقع
                    على الخريطة.
                  </p>
                  <Link
                    href={addressesReturnHref}
                    className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
                  >
                    أضف عنوانًا
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium">
                        العنوان التفصيلي
                      </label>
                      <Link
                        href={addressesReturnHref}
                        className="text-xs font-medium text-[var(--brand-primary)]"
                      >
                        أضف عنوانًا
                      </Link>
                    </div>
                    <select
                      value={selectedAddressId}
                      onChange={(event) => selectAddress(event.target.value)}
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
                    {selectedAddress ? (
                      <p className="text-xs leading-6 text-zinc-500">
                        {selectedAddress.addressLine}
                      </p>
                    ) : null}
                  </div>

                  {selectedAddressId ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">
                        موقع التوصيل على الخريطة
                      </h3>
                      {locationHint && deliveryConfirmed ? (
                        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          تم وضع الدبوس من عنوانك. عدّله إن لزم أو أرسل الطلب
                          مباشرة.
                        </p>
                      ) : null}
                      <DeliveryLocationPicker
                        key={selectedAddressId || "no-address"}
                        value={deliveryCoords}
                        confirmed={deliveryConfirmed}
                        onChange={setDeliveryCoords}
                        onConfirmedChange={setDeliveryConfirmed}
                        initialHint={locationHint}
                      />
                    </div>
                  ) : (
                    <p className="text-xs leading-6 text-zinc-500">
                      اختر عنوانًا لفتح الخريطة بدبوس جاهز.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">وسيلة التواصل (الهاتف)</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div className="space-y-2">
              <label className="block font-medium">رقم الهاتف المسجّل</label>
              <input
                type="tel"
                value={registeredPhone || "غير متوفر على الحساب"}
                readOnly
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 outline-none"
              />
              <p className="text-xs leading-6 text-zinc-500">
                يُجلب تلقائيًا من بيانات تسجيل حسابك في التطبيق.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block font-medium" htmlFor="contactPhone">
                رقم هاتف تواصل آخر (اختياري)
              </label>
              <input
                id="contactPhone"
                type="tel"
                inputMode="numeric"
                placeholder="01*********"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none"
              />
            </div>
          </div>
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
