import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultPromoBanners } from "@/lib/promos";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    await ensureDefaultPromoBanners();
    const banners = await db.promoBanner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ banners });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل العروض.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const payload = (await request.json()) as {
      title?: string;
      subtitle?: string;
      imageUrl?: string;
      priceLabel?: string;
      oldPriceLabel?: string;
      sortOrder?: number;
      isActive?: boolean;
    };

    if (!payload.title?.trim() || !payload.imageUrl?.trim()) {
      return NextResponse.json(
        { error: "العنوان والصورة مطلوبان." },
        { status: 400 },
      );
    }

    const banner = await db.promoBanner.create({
      data: {
        title: payload.title.trim(),
        subtitle: payload.subtitle?.trim() || null,
        imageUrl: payload.imageUrl.trim(),
        priceLabel: payload.priceLabel?.trim() || null,
        oldPriceLabel: payload.oldPriceLabel?.trim() || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive ?? true,
      },
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حفظ العرض.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
