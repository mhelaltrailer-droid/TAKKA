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
  const query = searchParams.get("q")?.trim() ?? "";

  const kitchens = await db.kitchen.findMany({
    where: {
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
      ...(query
        ? {
            OR: [
              {
                kitchenName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                menuItems: {
                  some: {
                    isAvailable: true,
                    approvalStatus: ApprovalStatus.APPROVED,
                    OR: [
                      {
                        name: {
                          contains: query,
                          mode: "insensitive",
                        },
                      },
                      {
                        categoryId: {
                          equals: query,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      kitchenName: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      cityName: true,
      averageRating: true,
      reviewsCount: true,
      region: {
        select: {
          regionName: true,
          cityName: true,
        },
      },
      menuItems: {
        where: {
          isAvailable: true,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
          isDishOfTheDay: true,
          dishOfTheDayPrice: true,
          dishOfTheDayQty: true,
          description: true,
          imageUrl: true,
          basePrice: true,
          kitchenId: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        take: 24,
      },
      flashOffers: {
        where: {
          status: FlashOfferStatus.ACTIVE,
          endsAt: { gt: new Date() },
          quantityLeft: { gt: 0 },
        },
        include: {
          menuItem: {
            select: { name: true, imageUrl: true, basePrice: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
  });

  await expireStaleFlashOffers(kitchens.map((k) => k.id));

  return NextResponse.json({
    kitchens: kitchens.map((kitchen) => {
      const dishItem = kitchen.menuItems.find(
        (item) =>
          item.isDishOfTheDay &&
          item.dishOfTheDayPrice != null &&
          (item.dishOfTheDayQty == null || item.dishOfTheDayQty > 0),
      );
      const flash = kitchen.flashOffers[0];

      return {
        ...kitchen,
        menuItemsCount: kitchen.menuItems.length,
        menuItemNames: kitchen.menuItems.map((item) => item.name),
        menuItemCategoryIds: [
          ...new Set(kitchen.menuItems.map((item) => item.categoryId)),
        ],
        dishOfTheDay: dishItem
          ? serializeDishOfTheDay({
              ...dishItem,
              kitchen: {
                kitchenName: kitchen.kitchenName,
                slug: kitchen.slug,
                region: kitchen.region,
              },
            })
          : null,
        activeFlashOffer: flash
          ? serializeFlashOffer({
              ...flash,
              kitchen: {
                kitchenName: kitchen.kitchenName,
                slug: kitchen.slug,
                region: kitchen.region,
              },
            })
          : null,
      };
    }),
  });
}
