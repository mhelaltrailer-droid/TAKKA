"use client";

import { useState, useTransition } from "react";

import type { ServiceAreaValues } from "@/lib/service-area";

import { updateServiceArea } from "./actions";

export function ServiceAreaForm({ initial }: { initial: ServiceAreaValues }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaved(false);
    startTransition(async () => {
      const result = await updateServiceArea(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">اسم النطاق</span>
        <input
          name="label"
          required
          defaultValue={initial.label}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          خط عرض المركز
        </span>
        <input
          name="centerLatitude"
          type="number"
          step="any"
          required
          defaultValue={initial.centerLatitude}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          خط طول المركز
        </span>
        <input
          name="centerLongitude"
          type="number"
          step="any"
          required
          defaultValue={initial.centerLongitude}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          نصف القطر (كم)
        </span>
        <input
          name="radiusKm"
          type="number"
          min={0.1}
          max={100}
          step="any"
          required
          defaultValue={initial.radiusKm}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
        <span className="mt-1 block text-xs leading-6 text-zinc-500">
          التوصيل يُقبل فقط داخل هذه الدائرة حول المركز. القيمة الافتراضية
          تغطي مدينة العبور.
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          رسالة الرفض خارج النطاق
        </span>
        <textarea
          name="outOfAreaMessage"
          required
          rows={3}
          maxLength={120}
          defaultValue={initial.outOfAreaMessage}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
        <span className="mt-1 block text-xs leading-6 text-zinc-500">
          تظهر للعميل كما هي عند حفظ عنوان أو إرسال طلب خارج الدائرة. من 8 إلى
          120 حرفًا.
        </span>
      </label>
      {error ? (
        <p className="text-sm font-medium text-[#b42318]">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-emerald-700">تم حفظ الإعدادات.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
