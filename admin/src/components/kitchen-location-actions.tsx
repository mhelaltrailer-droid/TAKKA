"use client";

import { useState } from "react";

import { googleMapsShareUrl, isValidLatLng } from "@/lib/maps";

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
  const [copied, setCopied] = useState(false);
  const hasCoords = isValidLatLng(latitude, longitude);
  const mapsUrl = hasCoords
    ? googleMapsShareUrl(Number(latitude), Number(longitude))
    : null;
  const fullAddress = [addressLine?.trim(), regionLabel?.trim()]
    .filter(Boolean)
    .join(" · ");

  async function copyMapsUrl(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-800">موقع المطبخ</p>
      {fullAddress ? (
        <p className="text-sm leading-6 text-zinc-700">{fullAddress}</p>
      ) : null}
      {hasCoords && mapsUrl ? (
        <>
          <button
            type="button"
            onClick={() => void copyMapsUrl(mapsUrl)}
            className="flex w-full flex-col items-start gap-1 rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-right text-white"
          >
            <span className="text-sm font-semibold">
              {copied ? "تم النسخ ✓" : "نسخ عنوان الخريطة"}
            </span>
            <span className="text-xs opacity-90">
              رابط Google Maps لموقع المطبخ
            </span>
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full rounded-xl border border-zinc-300 px-3 py-2 text-center text-xs font-medium text-zinc-700"
          >
            عرض على الخريطة
          </a>
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
