"use client";

import { useState } from "react";

import { formatCoords, googleMapsShareUrl } from "@/lib/maps";

type DeliveryLocationActionsProps = {
  latitude: number;
  longitude: number;
  fullAddress?: string | null;
};

export function DeliveryLocationActions({
  latitude,
  longitude,
  fullAddress,
}: DeliveryLocationActionsProps) {
  const [copied, setCopied] = useState<"maps" | "address" | null>(null);
  const mapsUrl = googleMapsShareUrl(latitude, longitude);

  async function copyText(text: string, kind: "maps" | "address") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-800">عنوان وتوصيل الطلب</p>
      <p className="text-xs text-zinc-500">
        الإحداثيات: {formatCoords(latitude, longitude)}
      </p>
      <button
        type="button"
        onClick={() => void copyText(mapsUrl, "maps")}
        className="flex w-full flex-col items-start gap-1 rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-right text-white"
      >
        <span className="text-sm font-semibold">
          {copied === "maps" ? "تم النسخ ✓" : "نسخ عنوان الخريطة"}
        </span>
        <span className="text-xs opacity-90">
          الصقه مباشرة في تطبيق توصيل (رابط Google Maps)
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-zinc-300 px-3 py-2 text-center text-xs font-medium text-zinc-700"
        >
          عرض على الخريطة
        </a>
        <button
          type="button"
          onClick={() =>
            void copyText(
              fullAddress?.trim() || formatCoords(latitude, longitude),
              "address",
            )
          }
          className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700"
        >
          {copied === "address" ? "تم النسخ ✓" : "نسخ العنوان كاملاً"}
        </button>
      </div>
    </div>
  );
}
