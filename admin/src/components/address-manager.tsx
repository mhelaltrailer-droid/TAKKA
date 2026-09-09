"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ObourLocationFields } from "@/components/obour-location-fields";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

type Address = {
  id: string;
  label: string;
  cityName: string;
  addressLine: string;
  landmark: string | null;
  isDefault: boolean;
  region: {
    cityName: string;
    regionName: string;
  };
};

type AddressManagerProps = {
  initialAddresses: Address[];
};

export function AddressManager({ initialAddresses }: AddressManagerProps) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    cityName: OBOUR_CITY_NAME,
    regionName: "",
    addressLine: "",
    landmark: "",
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: addresses.length === 0,
  });

  const hasAddresses = useMemo(() => addresses.length > 0, [addresses.length]);

  async function createAddress() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          cityName: OBOUR_CITY_NAME,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر حفظ العنوان.");
      }

      const nextAddresses = form.isDefault
        ? [
            result.address,
            ...addresses.map((address) => ({ ...address, isDefault: false })),
          ]
        : [...addresses, result.address];

      setAddresses(nextAddresses);
      setForm({
        label: "",
        cityName: OBOUR_CITY_NAME,
        regionName: "",
        addressLine: "",
        landmark: "",
        latitude: null,
        longitude: null,
        isDefault: false,
      });
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر حفظ العنوان.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteAddress(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customer/addresses/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف العنوان.");
      }

      setAddresses((current) => current.filter((address) => address.id !== id));
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر حذف العنوان.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function setDefaultAddress(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customer/addresses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isDefault: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تحديث العنوان.");
      }

      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          isDefault: address.id === id,
        })),
      );
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تحديث العنوان.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">إضافة عنوان جديد</h2>
        <div className="mt-5 space-y-4">
          <input
            value={form.label}
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
            placeholder="اسم العنوان: منزل، عمل..."
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />

          <ObourLocationFields
            regionName={form.regionName}
            onRegionChange={(regionName) =>
              setForm((current) => ({ ...current, regionName }))
            }
            onCoordsChange={(coords) =>
              setForm((current) => ({
                ...current,
                latitude: coords?.latitude ?? null,
                longitude: coords?.longitude ?? null,
              }))
            }
          />

          <input
            value={form.addressLine}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                addressLine: event.target.value,
              }))
            }
            placeholder="العنوان التفصيلي"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          <input
            value={form.landmark}
            onChange={(event) =>
              setForm((current) => ({ ...current, landmark: event.target.value }))
            }
            placeholder="علامة مميزة (اختياري)"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isDefault: event.target.checked,
                }))
              }
            />
            تعيين كعنوان افتراضي
          </label>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={createAddress}
            disabled={loading}
            className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "جارٍ الحفظ..." : "حفظ العنوان"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">عناويني</h2>
        <div className="mt-5 space-y-4">
          {!hasAddresses ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
              لا توجد عناوين محفوظة بعد.
            </div>
          ) : (
            addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{address.label}</h3>
                  {address.isDefault ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                      افتراضي
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-sm leading-7 text-zinc-600">
                  <p>
                    {address.region.cityName} - {address.region.regionName}
                  </p>
                  <p>{address.addressLine}</p>
                  {address.landmark ? <p>{address.landmark}</p> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {!address.isDefault ? (
                    <button
                      type="button"
                      onClick={() => setDefaultAddress(address.id)}
                      disabled={loading}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                    >
                      جعله افتراضيًا
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteAddress(address.id)}
                    disabled={loading}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                  >
                    حذف
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
