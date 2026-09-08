import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityName = searchParams.get("cityName")?.trim();
  const regionName = searchParams.get("regionName")?.trim();

  const kitchens = await db.kitchen.findMany({
    where: {
      approvalStatus: ApprovalStatus.APPROVED,
      availabilityStatus: AvailabilityStatus.OPEN,
      ...(cityName
        ? {
            cityName,
          }
        : {}),
      ...(regionName
        ? {
            region: {
              regionName,
            },
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
        },
      },
    },
    orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    kitchens: kitchens.map((kitchen) => ({
      ...kitchen,
      menuItemsCount: kitchen.menuItems.length,
    })),
  });
}
