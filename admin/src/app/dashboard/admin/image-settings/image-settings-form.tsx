"use client";

import { useState, useTransition } from "react";

import {
  WATERMARK_POSITIONS,
  type ImageDisplaySettingsValues,
  type WatermarkPosition,
} from "@/lib/image-settings";

import { updateImageDisplaySettings } from "./actions";

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  bottomLeft: "أسفل اليسار",
  bottomRight: "أسفل اليمين",
  topLeft: "أعلى اليسار",
  topRight: "أعلى اليمين",
};

export function ImageSettingsForm({
  initial,
}: {
  initial: ImageDisplaySettingsValues;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaved(false);
    startTransition(async () => {
      const result = await updateImageDisplaySettings(formData);
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
          name="watermarkEnabled"
          defaultChecked={initial.watermarkEnabled}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-semibold text-[#3b2418]">
            إظهار علامة تكة المائية عند العرض
          </span>
          <span className="mt-1 block text-xs leading-6 text-zinc-500">
            لا تُحرق داخل الملف المخزّن — تظهر فقط فوق صور الأصناف والغلاف في
            الواجهة.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="enhancementEnabled"
          defaultChecked={initial.enhancementEnabled}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-semibold text-[#3b2418]">
            تحسين خفيف لصور الطعام على الموبايل
          </span>
          <span className="mt-1 block text-xs leading-6 text-zinc-500">
            سطوع/تباين بسيط مع شارب خفيف قبل الرفع (أصناف + غلاف). المستندات
            وإثبات العربون بدون تحسين. الويب يكتفي بالضغط والقص.
          </span>
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          موضع العلامة المائية
        </span>
        <select
          name="watermarkPosition"
          defaultValue={initial.watermarkPosition}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        >
          {WATERMARK_POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {POSITION_LABELS[pos]}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          تم حفظ إعدادات الصور.
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
