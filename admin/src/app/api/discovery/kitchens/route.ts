import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
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
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        take: 24,
      },
    },
    orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    kitchens: kitchens.map((kitchen) => ({
      ...kitchen,
      menuItemsCount: kitchen.menuItems.length,
      menuItemNames: kitchen.menuItems.map((item) => item.name),
      menuItemCategoryIds: [
        ...new Set(kitchen.menuItems.map((item) => item.categoryId)),
      ],
    })),
  });
}
