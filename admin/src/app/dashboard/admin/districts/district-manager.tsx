"use client";

import { useState } from "react";

type District = {
  id: string;
  regionName: string;
  isActive: boolean;
  _count: {
    kitchens: number;
    customerAddresses: number;
  };
};

type DistrictManagerProps = {
  cityName: string;
  initialDistricts: District[];
};

export function DistrictManager({
  cityName,
  initialDistricts,
}: DistrictManagerProps) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function addDistrict() {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/admin/districts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionName: name }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر إضافة الحي.");
      }

      setDistricts((current) => {
        const without = current.filter((item) => item.id !== result.district.id);
        return [...without, result.district].sort((a, b) =>
          a.regionName.localeCompare(b.regionName, "ar"),
        );
      });
      setName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إضافة الحي.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(id: string) {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/districts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionName: editingName }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر تعديل الحي.");
      }

      setDistricts((current) =>
        current
          .map((item) => (item.id === id ? result.district : item))
          .sort((a, b) => a.regionName.localeCompare(b.regionName, "ar")),
      );
      setEditingId(null);
      setEditingName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تعديل الحي.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(district: District) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/districts/${district.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !district.isActive }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر تحديث الحي.");
      }
      setDistricts((current) =>
        current.map((item) =>
          item.id === district.id ? result.district : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحديث الحي.");
    } finally {
      setLoading(false);
    }
  }

  async function removeDistrict(id: string) {
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/admin/districts/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف الحي.");
      }

      if (result.softDeleted && result.district) {
        setDistricts((current) =>
          current.map((item) =>
            item.id === id ? result.district : item,
          ),
        );
        setInfo(result.message || "تم إخفاء الحي لأنه مستخدم.");
      } else {
        setDistricts((current) => current.filter((item) => item.id !== id));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حذف الحي.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-xl text-[var(--brand-primary)]">
            ⌖
          </span>
          <div>
            <h2 className="text-xl font-semibold">إضافة حي جديد</h2>
            <p className="text-sm text-zinc-500">{cityName}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: الحي العاشر"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {info}
            </p>
          ) : null}
          <button
            type="button"
            onClick={addDistrict}
            disabled={loading || !name.trim()}
            className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "جارٍ الحفظ..." : "إضافة الحي"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">أحياء مدينة العبور</h2>
        <div className="mt-5 space-y-3">
          {districts.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
              لا توجد أحياء بعد.
            </div>
          ) : (
            districts.map((district) => (
              <article
                key={district.id}
                className="rounded-2xl border border-zinc-200 p-4"
              >
                {editingId === district.id ? (
                  <div className="space-y-3">
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(district.id)}
                        disabled={loading || !editingName.trim()}
                        className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        حفظ التعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {district.regionName}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          district.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {district.isActive ? "ظاهر في القائمة" : "مخفي"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      مطابخ: {district._count.kitchens} | عناوين:{" "}
                      {district._count.customerAddresses}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(district.id);
                          setEditingName(district.regionName);
                        }}
                        disabled={loading}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(district)}
                        disabled={loading}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                      >
                        {district.isActive ? "إخفاء" : "إظهار"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDistrict(district.id)}
                        disabled={loading}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                      >
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
