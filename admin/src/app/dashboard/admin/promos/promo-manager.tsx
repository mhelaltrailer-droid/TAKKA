"use client";

import { useState } from "react";

import { UploadButton } from "@/lib/uploadthing";

type PromoBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  priceLabel: string | null;
  oldPriceLabel: string | null;
  sortOrder: number;
  isActive: boolean;
};

type PromoManagerProps = {
  initialBanners: PromoBanner[];
};

export function PromoManager({ initialBanners }: PromoManagerProps) {
  const [banners, setBanners] = useState(initialBanners);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [oldPriceLabel, setOldPriceLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createBanner() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          priceLabel,
          oldPriceLabel,
          imageUrl,
          sortOrder: banners.length + 1,
          isActive: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "تعذر إضافة العرض.");
      }

      setBanners((current) => [...current, result.banner]);
      setTitle("");
      setSubtitle("");
      setPriceLabel("");
      setOldPriceLabel("");
      setImageUrl("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر إضافة العرض.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(banner: PromoBanner) {
    const response = await fetch(`/api/admin/promos/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "تعذر تحديث العرض.");
      return;
    }
    setBanners((current) =>
      current.map((item) => (item.id === banner.id ? result.banner : item)),
    );
  }

  async function removeBanner(id: string) {
    const response = await fetch(`/api/admin/promos/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "تعذر حذف العرض.");
      return;
    }
    setBanners((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              <rect x="3" y="3" width="18" height="18" rx="4" opacity="0.35" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-semibold">رفع صور وعروض الشريط</h2>
            <p className="text-sm text-zinc-500">
              تظهر تلقائيًا في الصفحة الرئيسية للويب والتطبيق.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان العرض"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          <input
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            placeholder="وصف قصير (اختياري)"
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={priceLabel}
              onChange={(event) => setPriceLabel(event.target.value)}
              placeholder="السعر مثل: ١٥٩ جنيه"
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            />
            <input
              value={oldPriceLabel}
              onChange={(event) => setOldPriceLabel(event.target.value)}
              placeholder="السعر قبل الخصم"
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p className="mb-3 text-sm font-medium">أيقونة رفع صورة العرض</p>
            <UploadButton
              endpoint="promoBannerImage"
              appearance={{
                button:
                  "ut-ready:bg-[var(--brand-primary)] ut-uploading:bg-zinc-400 ut-ready:text-white",
                container: "w-full items-start",
              }}
              content={{
                button({ ready }) {
                  return ready ? "رفع صورة العرض" : "جارٍ التحضير...";
                },
              }}
              onClientUploadComplete={(res) => {
                const uploaded = res?.[0];
                if (uploaded?.ufsUrl) {
                  setImageUrl(uploaded.ufsUrl);
                }
              }}
              onUploadError={(uploadError: Error) => {
                setError(`فشل رفع الصورة: ${uploadError.message}`);
              }}
            />
            {imageUrl ? (
              <p className="mt-3 text-xs text-emerald-700">تم رفع الصورة بنجاح.</p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={createBanner}
            disabled={loading || !title.trim() || !imageUrl}
            className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "جارٍ الحفظ..." : "إضافة إلى شريط العروض"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">العروض الحالية</h2>
        <div className="mt-5 space-y-4">
          {banners.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
              لا توجد عروض بعد.
            </div>
          ) : (
            banners.map((banner) => (
              <article
                key={banner.id}
                className="overflow-hidden rounded-2xl border border-zinc-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="h-36 w-full object-cover"
                />
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{banner.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        banner.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {banner.isActive ? "ظاهر" : "مخفي"}
                    </span>
                  </div>
                  {banner.subtitle ? (
                    <p className="text-sm text-zinc-600">{banner.subtitle}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(banner)}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                    >
                      {banner.isActive ? "إخفاء" : "إظهار"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBanner(banner.id)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
