import { ApprovalStatus, AvailabilityStatus, FlashOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  expireStaleFlashOffers,
  serializeDishOfTheDay,
  serializeFlashOffer,
} from "@/lib/deals";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

export type PromoDealOption = {
  key: string;
  kind: "flash" | "dish";
  kindLabel: string;
  title: string;
  kitchenName: string;
  imageUrl: string | null;
  offerPrice: number;
  basePrice: number;
  flashOfferId?: string;
  menuItemId: string;
  kitchenId: string;
};

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const kitchens = await db.kitchen.findMany({
      where: {
        approvalStatus: ApprovalStatus.APPROVED,
        availabilityStatus: AvailabilityStatus.OPEN,
        cityName: OBOUR_CITY_NAME,
      },
      select: { id: true },
    });
    const kitchenIds = kitchens.map((kitchen) => kitchen.id);

    if (!kitchenIds.length) {
      return NextResponse.json({ options: [] as PromoDealOption[] });
    }

    await expireStaleFlashOffers(kitchenIds);

    const [dishes, flashes] = await Promise.all([
      db.menuItem.findMany({
        where: {
          kitchenId: { in: kitchenIds },
          isDishOfTheDay: true,
          approvalStatus: ApprovalStatus.APPROVED,
          dishOfTheDayPrice: { not: null },
          OR: [{ dishOfTheDayQty: null }, { dishOfTheDayQty: { gt: 0 } }],
        },
        include: {
          kitchen: {
            select: {
              kitchenName: true,
              slug: true,
              region: { select: { regionName: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 40,
      }),
      db.flashOffer.findMany({
        where: {
          kitchenId: { in: kitchenIds },
          status: FlashOfferStatus.ACTIVE,
          endsAt: { gt: new Date() },
          quantityLeft: { gt: 0 },
          menuItem: {
            approvalStatus: ApprovalStatus.APPROVED,
          },
        },
        include: {
          menuItem: {
            select: { name: true, imageUrl: true, basePrice: true },
          },
          kitchen: {
            select: {
              kitchenName: true,
              slug: true,
              region: { select: { regionName: true } },
            },
          },
        },
        orderBy: { endsAt: "asc" },
        take: 40,
      }),
    ]);

    const dishOptions: PromoDealOption[] = dishes
      .map((item) => serializeDishOfTheDay(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((dish) => ({
        key: `dish:${dish.menuItemId}`,
        kind: "dish" as const,
        kindLabel: "طبق اليوم",
        title: dish.name,
        kitchenName: dish.kitchenName ?? "مطبخ",
        imageUrl: dish.imageUrl,
        offerPrice: dish.dishOfTheDayPrice,
        basePrice: dish.basePrice,
        menuItemId: dish.menuItemId,
        kitchenId: dish.kitchenId,
      }));

    const flashOptions: PromoDealOption[] = flashes.map((offer) => {
      const flash = serializeFlashOffer(offer);
      return {
        key: `flash:${flash.id}`,
        kind: "flash" as const,
        kindLabel: "عرض سريع",
        title: flash.itemName,
        kitchenName: flash.kitchenName ?? "مطبخ",
        imageUrl: flash.imageUrl,
        offerPrice: flash.offerPrice,
        basePrice: flash.basePrice,
        flashOfferId: flash.id,
        menuItemId: flash.menuItemId,
        kitchenId: flash.kitchenId,
      };
    });

    return NextResponse.json({
      options: [...flashOptions, ...dishOptions],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل عروض المطابخ.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
