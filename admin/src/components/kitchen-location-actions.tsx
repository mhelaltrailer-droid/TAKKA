"use client";

import { useState } from "react";

import { formatCoords, googleMapsShareUrl, isValidLatLng } from "@/lib/maps";

type KitchenLocationActionsProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  addressLine?: string | null;
  regionLabel?: string | null;
};

/**
 * Customer-facing kitchen pin actions (same pattern as DeliveryLocationActions).
 * Helps decide pickup vs delivery before ordering.
 */
export function KitchenLocationActions({
  latitude,
  longitude,
  addressLine,
  regionLabel,
}: KitchenLocationActionsProps) {
  const [copied, setCopied] = useState<"maps" | "address" | null>(null);
  const hasCoords = isValidLatLng(latitude, longitude);
  const mapsUrl = hasCoords
    ? googleMapsShareUrl(Number(latitude), Number(longitude))
    : null;
  const fullAddress = [addressLine?.trim(), regionLabel?.trim()]
    .filter(Boolean)
    .join(" · ");

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
      <p className="text-sm font-medium text-zinc-800">موقع المطبخ</p>
      <p className="text-xs leading-6 text-zinc-500">
        شوف موقع المطبخ على الخريطة عشان تقرر: توصيل ولا استلام بنفسك؟
      </p>
      {fullAddress ? (
        <p className="text-sm leading-6 text-zinc-700">{fullAddress}</p>
      ) : null}
      {hasCoords && mapsUrl ? (
        <>
          <p className="text-xs text-zinc-500">
            الإحداثيات: {formatCoords(Number(latitude), Number(longitude))}
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
              رابط Google Maps لموقع المطبخ
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
                  fullAddress ||
                    formatCoords(Number(latitude), Number(longitude)),
                  "address",
                )
              }
              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700"
            >
              {copied === "address" ? "تم النسخ ✓" : "نسخ العنوان كاملاً"}
            </button>
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-950">
          الموقع على الخريطة غير متاح لهذا المطبخ حاليًا.
          {fullAddress ? " يمكنك الاعتماد على العنوان النصي أعلاه." : null}
        </p>
      )}
    </div>
  );
}
