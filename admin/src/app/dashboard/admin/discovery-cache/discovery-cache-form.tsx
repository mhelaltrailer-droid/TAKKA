"use client";

import { useState, useTransition } from "react";

import {
  DISCOVERY_CACHE_TTL_MAX,
  DISCOVERY_CACHE_TTL_MIN,
  type DiscoveryCacheSettingsValues,
} from "@/lib/discovery-cache-settings";

import { updateDiscoveryCacheSettings } from "./actions";

export function DiscoveryCacheForm({
  initial,
}: {
  initial: DiscoveryCacheSettingsValues;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaved(false);
    startTransition(async () => {
      const result = await updateDiscoveryCacheSettings(formData);
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
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="cacheEnabled"
          defaultChecked={initial.cacheEnabled}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-semibold text-[#3b2418]">
            تفعيل التخزين المؤقت لقائمة الاكتشاف
          </span>
          <span className="mt-1 block text-xs leading-6 text-zinc-500">
            يخزّن صفحات GET /api/discovery/kitchens/feed في ذاكرة السيرفر
            (بما فيها نتائج البحث القصيرة). إيقافه يجبر كل طلب على قاعدة
            البيانات. التخزين لا يؤثر على الدفع — التحقق من التوفر يتم عند
            الاقتباس.
          </span>
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          مدة التخزين المؤقت (ثانية)
        </span>
        <input
          type="number"
          name="ttlSeconds"
          min={DISCOVERY_CACHE_TTL_MIN}
          max={DISCOVERY_CACHE_TTL_MAX}
          defaultValue={initial.ttlSeconds}
          required
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
        <span className="mt-1 block text-xs leading-6 text-zinc-500">
          الافتراضي 60. المدى المسموح {DISCOVERY_CACHE_TTL_MIN}–
          {DISCOVERY_CACHE_TTL_MAX}.
        </span>
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          تم حفظ إعدادات التخزين المؤقت ومسح الصفحات المخزّنة.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "جارٍ الحفظ..." : "حفظ"}
      </button>
    </form>
  );
}
