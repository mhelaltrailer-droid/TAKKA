import { ApprovalStatus, AvailabilityStatus, FlashOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  expireStaleFlashOffers,
  serializeDishOfTheDay,
  serializeFlashOffer,
} from "@/lib/deals";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const kitchen = await db.kitchen.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      approvalStatus: ApprovalStatus.APPROVED,
      availabilityStatus: AvailabilityStatus.OPEN,
    },
    include: {
      region: true,
      gallery: true,
      paymentMethods: {
        where: {
          isActive: true,
        },
      },
      menuItems: {
        where: {
          isAvailable: true,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        include: {
          sizes: {
            where: {
              isActive: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
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
      reviews: {
        where: {
          visibility: "VISIBLE",
        },
        include: {
          customer: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!kitchen) {
    return NextResponse.json({ error: "المطبخ غير موجود." }, { status: 404 });
  }

  await expireStaleFlashOffers([kitchen.id]);

  const dishItem = await db.menuItem.findFirst({
    where: {
      kitchenId: kitchen.id,
      isDishOfTheDay: true,
      approvalStatus: ApprovalStatus.APPROVED,
      dishOfTheDayPrice: { not: null },
      OR: [{ dishOfTheDayQty: null }, { dishOfTheDayQty: { gt: 0 } }],
    },
  });

  const flashRaw = kitchen.flashOffers[0];
  const flash =
    flashRaw &&
    (await db.menuItem.findFirst({
      where: { id: flashRaw.menuItemId, approvalStatus: ApprovalStatus.APPROVED },
      select: { id: true },
    }))
      ? flashRaw
      : null;

  const { flashOffers: _ignored, ...kitchenRest } = kitchen;

  return NextResponse.json({
    kitchen: {
      ...kitchenRest,
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
    },
  });
}
