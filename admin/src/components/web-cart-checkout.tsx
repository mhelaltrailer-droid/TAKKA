"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { CheckoutPricingSummary } from "@/components/checkout-pricing-summary";
import type { DeliveryCoords } from "@/components/delivery-location-picker";
import { KitchenLocationActions } from "@/components/kitchen-location-actions";
import {
  ORDER_READINESS_CUSTOMER_QUESTION,
  getOrderReadinessLabel,
} from "@/lib/order-readiness";
import {
  clearWebCart,
  getWebCart,
  subscribeWebCart,
  updateWebCartQuantity,
  webCartTotals,
  type WebCartState,
} from "@/lib/web-cart";

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

type WebCartCheckoutProps = {
  addresses: CustomerAddress[];
  registeredPhone: string | null;
};

const emptyCart: WebCartState = {
  kitchenId: null,
  kitchenName: null,
  kitchenSlug: null,
  kitchenLatitude: null,
  kitchenLongitude: null,
  kitchenAddressLine: null,
  kitchenRegionLabel: null,
  items: [],
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

export function WebCartCheckout({
  addresses,
  registeredPhone,
}: WebCartCheckoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const cart = useSyncExternalStore(
    subscribeWebCart,
    getWebCart,
    () => emptyCart,
  );
  const totals = webCartTotals(cart.items);

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

  async function submitOrder() {
    setLoading(true);
    setError(null);

    try {
      if (!cart.kitchenId || !cart.items.length) {
        throw new Error("السلة فارغة.");
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
          kitchenId: cart.kitchenId,
          deliveryType,
          customerAddressId:
            deliveryType === "delivery" ? selectedAddressId : undefined,
          customerNotes,
          customerContactPhone: contactPhone.trim() || undefined,
          deliveryLatitude:
            deliveryType === "delivery" ? deliveryCoords?.latitude : undefined,
          deliveryLongitude:
            deliveryType === "delivery" ? deliveryCoords?.longitude : undefined,
          items: cart.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            ...(item.menuItemSizeId
              ? { menuItemSizeId: item.menuItemSizeId }
              : {}),
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء الطلب.");
      }

      clearWebCart();
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

  if (!cart.items.length) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">السلة فارغة</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-600">
          ارجع إلى المنيو وأضف بعض الأصناف أولًا.
        </p>
        <Link
          href="/kitchens"
          className="mt-6 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white"
        >
          تصفح المطابخ
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            {cart.kitchenName ?? "مطبخ الطلب"}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            كل الطلبات في هذه السلة يجب أن تكون من نفس المطبخ.
          </p>
          {cart.kitchenSlug ? (
            <Link
              href={`/kitchens/${cart.kitchenSlug}`}
              className="mt-3 inline-flex text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
            >
              العودة للمنيو
            </Link>
          ) : null}
          <div className="mt-4">
            <CheckoutPricingSummary />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">أصناف السلة</h2>
            <button
              type="button"
              onClick={() => clearWebCart()}
              className="text-sm font-medium text-red-600"
            >
              تفريغ السلة
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {cart.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {item.menuItemName}
                    </h3>
                    {item.sizeName ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        الحجم: {item.sizeName}
                      </p>
                    ) : null}
                    <span className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                      {ORDER_READINESS_CUSTOMER_QUESTION}{" "}
                      {getOrderReadinessLabel(item.orderReadiness)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-800">
                    {(item.unitPrice * item.quantity).toFixed(2)} جنيه
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateWebCartQuantity(item.id, item.quantity - 1)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-lg leading-none"
                    aria-label="تقليل الكمية"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-base font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateWebCartQuantity(item.id, item.quantity + 1)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-lg leading-none"
                    aria-label="زيادة الكمية"
                  >
                    +
                  </button>
                  <p className="ms-auto text-xs text-zinc-500">
                    العربون: {(item.depositAmount * item.quantity).toFixed(2)}{" "}
                    جنيه
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">مراجعة الطلب</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <p>عدد العناصر: {totals.count}</p>
            <p>المجموع المبدئي: {totals.subtotal.toFixed(2)} جنيه</p>
            <p>العربون المتوقع: {totals.deposit.toFixed(2)} جنيه</p>
            <p className="text-xs text-zinc-500">
              رسوم التوصيل يحددها المطبخ عند القبول، وتظهر منفصلة في ملخص الطلب.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">طريقة الاستلام</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            شوف موقع المطبخ أولًا عشان تقرر: توصيل ولا استلام بنفسك؟
          </p>
          <div className="mt-4">
            <KitchenLocationActions
              latitude={cart.kitchenLatitude}
              longitude={cart.kitchenLongitude}
              addressLine={cart.kitchenAddressLine}
              regionLabel={cart.kitchenRegionLabel}
            />
          </div>
          {cart.kitchenSlug ? (
            <p className="mt-3 text-xs text-zinc-500">
              أو راجع تفاصيل المطبخ من{" "}
              <Link
                href={`/kitchens/${cart.kitchenSlug}`}
                className="font-semibold text-[var(--brand-secondary)] underline underline-offset-4"
              >
                هنا
              </Link>
              .
            </p>
          ) : null}
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
              <label className="block font-medium" htmlFor="cartContactPhone">
                رقم هاتف تواصل آخر (اختياري)
              </label>
              <input
                id="cartContactPhone"
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
