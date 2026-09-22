"use client";

import { useMemo, useState } from "react";

import type { LngLatPair } from "@/lib/district-polygon";
import { confirmDestructive } from "@/lib/confirm-destructive";

import {
  DistrictPolygonMap,
  type MapDistrictOverlay,
} from "./district-polygon-map";

export type AdminDistrict = {
  id: string;
  regionName: string;
  isActive: boolean;
  polygonRing: LngLatPair[] | null;
  _count: {
    kitchens: number;
    customerAddresses: number;
  };
};

type DistrictManagerProps = {
  cityName: string;
  initialDistricts: AdminDistrict[];
};

type EditorMode = "new" | "edit";

export function DistrictManager({
  cityName,
  initialDistricts,
}: DistrictManagerProps) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [mode, setMode] = useState<EditorMode>("new");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ring, setRing] = useState<LngLatPair[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const overlays: MapDistrictOverlay[] = useMemo(
    () =>
      districts.map((d) => ({
        id: d.id,
        name: d.regionName,
        ring: d.polygonRing,
      })),
    [districts],
  );

  const selected = districts.find((d) => d.id === selectedId) ?? null;
  const openVertexCount = (() => {
    if (!ring || ring.length === 0) return 0;
    if (
      ring.length >= 2 &&
      ring[0]![0] === ring[ring.length - 1]![0] &&
      ring[0]![1] === ring[ring.length - 1]![1]
    ) {
      return ring.length - 1;
    }
    return ring.length;
  })();

  function startNew() {
    setMode("new");
    setSelectedId(null);
    setName("");
    setRing(null);
    setError(null);
    setInfo(null);
  }

  function selectDistrict(district: AdminDistrict) {
    setMode("edit");
    setSelectedId(district.id);
    setName(district.regionName);
    setRing(district.polygonRing);
    setError(null);
    setInfo(null);
  }

  function undoLastPoint() {
    if (!ring || ring.length === 0) return;
    const open =
      ring.length >= 2 &&
      ring[0]![0] === ring[ring.length - 1]![0] &&
      ring[0]![1] === ring[ring.length - 1]![1]
        ? ring.slice(0, -1)
        : [...ring];
    open.pop();
    setRing(open.length ? open : null);
  }

  function clearRing() {
    setRing(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("اسم الحي مطلوب.");
      return;
    }
    if (openVertexCount > 0 && openVertexCount < 3) {
      setError("المضلع يحتاج 3 نقاط على الأقل، أو امسحه بالكامل.");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "new") {
        const response = await fetch("/api/admin/districts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regionName: trimmed,
            polygonRing: ring,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "تعذر إضافة الحي.");
        }
        setDistricts((current) => {
          const without = current.filter(
            (item) => item.id !== result.district.id,
          );
          return [...without, result.district].sort((a, b) =>
            a.regionName.localeCompare(b.regionName, "ar"),
          );
        });
        selectDistrict(result.district);
        setInfo("تم حفظ الحي.");
      } else if (selectedId) {
        const response = await fetch(`/api/admin/districts/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regionName: trimmed,
            polygonRing: ring,
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "تعذر حفظ الحي.");
        }
        setDistricts((current) =>
          current
            .map((item) => (item.id === selectedId ? result.district : item))
            .sort((a, b) => a.regionName.localeCompare(b.regionName, "ar")),
        );
        setRing(result.district.polygonRing);
        setInfo("تم حفظ التعديلات.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر الحفظ.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(district: AdminDistrict) {
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

  async function removeDistrict(id: string, regionName: string) {
    if (
      !confirmDestructive(
        `هل أنت متأكد من حذف الحي «${regionName}»؟ لا يمكن التراجع بسهولة.`,
      )
    ) {
      return;
    }
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
          current.map((item) => (item.id === id ? result.district : item)),
        );
        setInfo(result.message || "تم إخفاء الحي لأنه مستخدم.");
      } else {
        setDistricts((current) => current.filter((item) => item.id !== id));
        if (selectedId === id) {
          startNew();
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حذف الحي.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">أحياء {cityName}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              اختر حيًا للتعديل أو أضف حيًا جديدًا مع رسم المضلع.
            </p>
          </div>
          <button
            type="button"
            onClick={startNew}
            className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            + حي جديد
          </button>
        </div>

        <div className="mt-5 max-h-[640px] space-y-3 overflow-y-auto pe-1">
          {districts.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
              لا توجد أحياء بعد.
            </div>
          ) : (
            districts.map((district) => {
              const hasPolygon =
                !!district.polygonRing && district.polygonRing.length >= 4;
              const isSelected = selectedId === district.id;
              return (
                <article
                  key={district.id}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-zinc-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectDistrict(district)}
                    className="w-full text-start"
                  >
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
                        {district.isActive ? "ظاهر" : "مخفي"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          hasPolygon
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {hasPolygon ? "له مضلع" : "بدون مضلع"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      مطابخ: {district._count.kitchens} | عناوين:{" "}
                      {district._count.customerAddresses}
                    </p>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => selectDistrict(district)}
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
                      onClick={() =>
                        removeDistrict(district.id, district.regionName)
                      }
                      disabled={loading}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                    >
                      حذف
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-xl text-[var(--brand-primary)]">
            ⌖
          </span>
          <div>
            <h2 className="text-xl font-semibold">
              {mode === "new" ? "إضافة حي جديد" : "تعديل الحي والمضلع"}
            </h2>
            <p className="text-sm text-zinc-500">
              انقر على الخريطة لإضافة نقاط المضلع، ثم اسحب النقاط للتعديل.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">اسم الحي</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثال: الحي العاشر"
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            />
          </label>

          <DistrictPolygonMap
            ring={ring}
            overlays={overlays}
            activeDistrictId={selectedId}
            onChange={(next) => setRing(next)}
          />

          <p className="text-xs text-zinc-500">
            نقاط المضلع: {openVertexCount}
            {selected ? ` — ${selected.regionName}` : ""}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={undoLastPoint}
              disabled={loading || openVertexCount === 0}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              تراجع نقطة
            </button>
            <button
              type="button"
              onClick={clearRing}
              disabled={loading || openVertexCount === 0}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              مسح المضلع
            </button>
            <button
              type="button"
              onClick={save}
              disabled={loading || !name.trim()}
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {info}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
