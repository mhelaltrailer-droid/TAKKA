import { NextResponse } from "next/server";

import { listActivePromoBanners } from "@/lib/promos";

export async function GET() {
  try {
    const banners = await listActivePromoBanners();

    return NextResponse.json({
      banners: banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.imageUrl,
        priceLabel: banner.priceLabel,
        oldPriceLabel: banner.oldPriceLabel,
        sortOrder: banner.sortOrder,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل العروض.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
