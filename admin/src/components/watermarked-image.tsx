"use client";

import type { CSSProperties } from "react";

import type { WatermarkPosition } from "@/lib/image-settings";

type WatermarkedImageProps = {
  src: string;
  alt: string;
  kitchenName?: string | null;
  /** When false, renders a plain img (no overlay). */
  enabled?: boolean;
  position?: WatermarkPosition;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
};

const POSITION_CLASS: Record<WatermarkPosition, string> = {
  bottomLeft: "bottom-2 left-2 text-left",
  bottomRight: "bottom-2 right-2 text-right",
  topLeft: "top-2 left-2 text-left",
  topRight: "top-2 right-2 text-right",
};

/**
 * Display-time watermark only — never burned into the stored R2 object.
 * Small corner overlay: Takka + optional kitchen name.
 */
export function WatermarkedImage({
  src,
  alt,
  kitchenName,
  enabled = true,
  position = "bottomLeft",
  className,
  imgClassName,
  style,
}: WatermarkedImageProps) {
  if (!enabled) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={imgClassName ?? className} style={style} />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={imgClassName ?? "h-full w-full object-cover"}
      />
      <div
        className={`pointer-events-none absolute z-10 max-w-[45%] rounded-md bg-black/35 px-1.5 py-1 ${POSITION_CLASS[position]}`}
        aria-hidden
      >
        <p className="text-[10px] font-semibold leading-tight text-white/90">
          تكة
        </p>
        {kitchenName?.trim() ? (
          <p className="truncate text-[9px] leading-tight text-white/75">
            {kitchenName.trim()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
