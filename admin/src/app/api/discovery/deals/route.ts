import { ApprovalStatus, AvailabilityStatus, FlashOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  expireStaleFlashOffers,
  serializeDishOfTheDay,
  serializeFlashOffer,
} from "@/lib/deals";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityName = searchParams.get("cityName")?.trim() || OBOUR_CITY_NAME;
  const regionName = searchParams.get("regionName")?.trim();

  const kitchenWhere = {
    approvalStatus: ApprovalStatus.APPROVED,
    availabilityStatus: AvailabilityStatus.OPEN,
    cityName,
    ...(regionName
      ? {
          region: {
            regionName,
            cityName,
          },
        }
      : {}),
  };

  const kitchens = await db.kitchen.findMany({
    where: kitchenWhere,
    select: { id: true },
  });
  const kitchenIds = kitchens.map((k) => k.id);

  if (!kitchenIds.length) {
    return NextResponse.json({ dishesOfTheDay: [], flashOffers: [] });
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

  return NextResponse.json({
    dishesOfTheDay: dishes
      .map((item) => serializeDishOfTheDay(item))
      .filter(Boolean),
    flashOffers: flashes.map((offer) => serializeFlashOffer(offer)),
  });
}
