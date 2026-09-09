"use client";

import { useEffect, useState } from "react";

export type PromoSlide = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  priceLabel?: string | null;
  oldPriceLabel?: string | null;
};

type PromoCarouselProps = {
  slides: PromoSlide[];
  intervalMs?: number;
};

export function PromoCarousel({
  slides,
  intervalMs = 4000,
}: PromoCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[index] ?? slides[0];

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-[28px] border border-[#ead9c8] bg-[#1f1410] shadow-sm">
        <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt={slide.title}
            className="h-full w-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-1 p-5 text-white">
            <p className="text-xl font-bold">{slide.title}</p>
            {slide.subtitle ? (
              <p className="text-sm text-white/85">{slide.subtitle}</p>
            ) : null}
            <div className="flex flex-wrap items-baseline gap-2 pt-1">
              {slide.priceLabel ? (
                <span className="text-lg font-extrabold">{slide.priceLabel}</span>
              ) : null}
              {slide.oldPriceLabel ? (
                <span className="text-sm text-white/70 line-through">
                  بدل {slide.oldPriceLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {slides.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {slides.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`عرض ${item.title}`}
              onClick={() => setIndex(dotIndex)}
              className={`h-2.5 rounded-full transition-all ${
                dotIndex === index
                  ? "w-6 bg-[var(--brand-primary)]"
                  : "w-2.5 bg-[#ead9c8]"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
