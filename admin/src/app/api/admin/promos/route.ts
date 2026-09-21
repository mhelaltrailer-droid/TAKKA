import { ApprovalStatus, AvailabilityStatus, FlashOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultPromoBanners } from "@/lib/promos";

function formatPriceLabel(value: number) {
  const rounded = Math.round(value);
  return `${rounded} جنيه`;
}

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
      source?: string;
      kind?: "flash" | "dish";
      flashOfferId?: string;
      menuItemId?: string;
      title?: string;
      subtitle?: string;
      imageUrl?: string;
      priceLabel?: string;
      oldPriceLabel?: string;
      sortOrder?: number;
      isActive?: boolean;
    };

    if (payload.source === "kitchen_deal") {
      const banner = await createBannerFromKitchenDeal(payload);
      return NextResponse.json({ banner }, { status: 201 });
    }

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

async function createBannerFromKitchenDeal(payload: {
  kind?: "flash" | "dish";
  flashOfferId?: string;
  menuItemId?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const kind = payload.kind;
  if (kind !== "flash" && kind !== "dish") {
    throw new Error("نوع العرض غير صالح.");
  }

  let title = "";
  let kitchenName = "";
  let imageUrl: string | null = null;
  let offerPrice = 0;
  let basePrice = 0;
  const kindLabel = kind === "flash" ? "عرض سريع" : "طبق اليوم";

  if (kind === "flash") {
    const flashId = payload.flashOfferId?.trim() ?? "";
    if (!flashId) {
      throw new Error("معرّف العرض السريع مطلوب.");
    }

    const offer = await db.flashOffer.findFirst({
      where: {
        id: flashId,
        status: FlashOfferStatus.ACTIVE,
        endsAt: { gt: new Date() },
        quantityLeft: { gt: 0 },
        kitchen: {
          approvalStatus: ApprovalStatus.APPROVED,
          availabilityStatus: AvailabilityStatus.OPEN,
        },
        menuItem: {
          approvalStatus: ApprovalStatus.APPROVED,
        },
      },
      include: {
        menuItem: {
          select: { name: true, imageUrl: true, basePrice: true },
        },
        kitchen: {
          select: { kitchenName: true },
        },
      },
    });

    if (!offer) {
      throw new Error("العرض السريع غير متاح أو انتهى.");
    }

    title = offer.menuItem.name;
    kitchenName = offer.kitchen.kitchenName;
    imageUrl = offer.menuItem.imageUrl;
    offerPrice = Number(offer.offerPrice);
    basePrice = Number(offer.menuItem.basePrice);
  } else {
    const menuItemId = payload.menuItemId?.trim() ?? "";
    if (!menuItemId) {
      throw new Error("معرّف طبق اليوم مطلوب.");
    }

    const item = await db.menuItem.findFirst({
      where: {
        id: menuItemId,
        isDishOfTheDay: true,
        approvalStatus: ApprovalStatus.APPROVED,
        dishOfTheDayPrice: { not: null },
        OR: [{ dishOfTheDayQty: null }, { dishOfTheDayQty: { gt: 0 } }],
        kitchen: {
          approvalStatus: ApprovalStatus.APPROVED,
          availabilityStatus: AvailabilityStatus.OPEN,
        },
      },
      include: {
        kitchen: {
          select: { kitchenName: true },
        },
      },
    });

    if (!item || item.dishOfTheDayPrice == null) {
      throw new Error("طبق اليوم غير متاح.");
    }

    title = item.name;
    kitchenName = item.kitchen.kitchenName;
    imageUrl = item.imageUrl;
    offerPrice = Number(item.dishOfTheDayPrice);
    basePrice = Number(item.basePrice);
  }

  if (!imageUrl?.trim()) {
    throw new Error("لا توجد صورة لهذا العرض. اختر عرضًا ب صورة أو ارفع بانر يدويًا.");
  }

  return db.promoBanner.create({
    data: {
      title,
      subtitle: `${kitchenName} · ${kindLabel}`,
      imageUrl: imageUrl.trim(),
      priceLabel: formatPriceLabel(offerPrice),
      oldPriceLabel:
        basePrice > offerPrice ? String(Math.round(basePrice)) : null,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
    },
  });
}
