import { FlashOfferStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type ActiveFlashOfferView = {
  id: string;
  menuItemId: string;
  offerPrice: number;
  quantityLeft: number;
  startsAt: string;
  endsAt: string;
  itemName: string;
  imageUrl: string | null;
  basePrice: number;
  kitchenId: string;
  kitchenName?: string;
  kitchenSlug?: string;
  regionName?: string;
};

export type DishOfTheDayView = {
  menuItemId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  dishOfTheDayPrice: number;
  dishOfTheDayQty: number | null;
  kitchenId: string;
  kitchenName?: string;
  kitchenSlug?: string;
  regionName?: string;
};

function toNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

/** Mark stale ACTIVE flash offers as ENDED (lazy expiry). */
export async function expireStaleFlashOffers(kitchenIds?: string[]) {
  const now = new Date();
  const baseWhere = {
    status: FlashOfferStatus.ACTIVE,
    ...(kitchenIds?.length ? { kitchenId: { in: kitchenIds } } : {}),
  };

  await db.flashOffer.updateMany({
    where: {
      ...baseWhere,
      endsAt: { lte: now },
    },
    data: {
      status: FlashOfferStatus.ENDED,
      endedReason: "EXPIRED",
    },
  });

  await db.flashOffer.updateMany({
    where: {
      ...baseWhere,
      quantityLeft: { lte: 0 },
      endsAt: { gt: now },
    },
    data: {
      status: FlashOfferStatus.ENDED,
      endedReason: "SOLD_OUT",
    },
  });
}

export async function getActiveFlashOfferForKitchen(kitchenId: string) {
  await expireStaleFlashOffers([kitchenId]);

  const offer = await db.flashOffer.findFirst({
    where: {
      kitchenId,
      status: FlashOfferStatus.ACTIVE,
      endsAt: { gt: new Date() },
      quantityLeft: { gt: 0 },
    },
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          basePrice: true,
          isAvailable: true,
          approvalStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!offer) return null;
  if (offer.menuItem.approvalStatus !== "APPROVED") {
    return null;
  }

  return serializeFlashOffer(offer);
}

export function serializeFlashOffer(offer: {
  id: string;
  kitchenId: string;
  menuItemId: string;
  offerPrice: Prisma.Decimal;
  quantityLeft: number;
  startsAt: Date;
  endsAt: Date;
  menuItem: {
    name: string;
    imageUrl: string | null;
    basePrice: Prisma.Decimal;
  };
  kitchen?: { kitchenName: string; slug: string; region?: { regionName: string } | null };
}): ActiveFlashOfferView {
  return {
    id: offer.id,
    kitchenId: offer.kitchenId,
    menuItemId: offer.menuItemId,
    offerPrice: toNumber(offer.offerPrice),
    quantityLeft: offer.quantityLeft,
    startsAt: offer.startsAt.toISOString(),
    endsAt: offer.endsAt.toISOString(),
    itemName: offer.menuItem.name,
    imageUrl: offer.menuItem.imageUrl,
    basePrice: toNumber(offer.menuItem.basePrice),
    kitchenName: offer.kitchen?.kitchenName,
    kitchenSlug: offer.kitchen?.slug,
    regionName: offer.kitchen?.region?.regionName,
  };
}

export function serializeDishOfTheDay(item: {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: Prisma.Decimal;
  dishOfTheDayPrice: Prisma.Decimal | null;
  dishOfTheDayQty: number | null;
  kitchenId: string;
  kitchen?: { kitchenName: string; slug: string; region?: { regionName: string } | null };
}): DishOfTheDayView | null {
  if (item.dishOfTheDayPrice == null) return null;
  if (item.dishOfTheDayQty != null && item.dishOfTheDayQty <= 0) return null;

  return {
    menuItemId: item.id,
    name: item.name,
    description: item.description,
    imageUrl: item.imageUrl,
    basePrice: toNumber(item.basePrice),
    dishOfTheDayPrice: toNumber(item.dishOfTheDayPrice),
    dishOfTheDayQty: item.dishOfTheDayQty,
    kitchenId: item.kitchenId,
    kitchenName: item.kitchen?.kitchenName,
    kitchenSlug: item.kitchen?.slug,
    regionName: item.kitchen?.region?.regionName,
  };
}

type DealPriceParams = {
  kitchenId: string;
  menuItemId: string;
  quantity: number;
  regularUnitPrice: Prisma.Decimal;
  isDishOfTheDay: boolean;
  dishOfTheDayPrice: Prisma.Decimal | null;
  dishOfTheDayQty: number | null;
};

function dishApplies(params: DealPriceParams) {
  return (
    params.isDishOfTheDay &&
    params.dishOfTheDayPrice != null &&
    (params.dishOfTheDayQty == null ||
      params.dishOfTheDayQty >= params.quantity)
  );
}

/**
 * Same deal choice as order creation, without decrementing stock.
 * Quotes must use this so a preview cannot consume a flash or dish portion.
 */
export async function selectDealUnitPrice(params: DealPriceParams): Promise<{
  unitPrice: Prisma.Decimal;
  dealType: "flash" | "dish_of_the_day" | null;
  flashOfferId: string | null;
  flashQuantityLeft: number | null;
}> {
  await expireStaleFlashOffers([params.kitchenId]);

  const flash = await db.flashOffer.findFirst({
    where: {
      kitchenId: params.kitchenId,
      menuItemId: params.menuItemId,
      status: FlashOfferStatus.ACTIVE,
      endsAt: { gt: new Date() },
      quantityLeft: { gte: params.quantity },
    },
  });

  if (flash) {
    return {
      unitPrice: flash.offerPrice,
      dealType: "flash",
      flashOfferId: flash.id,
      flashQuantityLeft: flash.quantityLeft,
    };
  }

  if (dishApplies(params) && params.dishOfTheDayPrice != null) {
    return {
      unitPrice: params.dishOfTheDayPrice,
      dealType: "dish_of_the_day",
      flashOfferId: null,
      flashQuantityLeft: null,
    };
  }

  return {
    unitPrice: params.regularUnitPrice,
    dealType: null,
    flashOfferId: null,
    flashQuantityLeft: null,
  };
}

async function takeDishOfTheDay(params: DealPriceParams): Promise<{
  unitPrice: Prisma.Decimal;
  dealType: "dish_of_the_day" | null;
} | null> {
  if (!dishApplies(params) || params.dishOfTheDayPrice == null) {
    return null;
  }

  if (params.dishOfTheDayQty != null) {
    const updated = await db.menuItem.updateMany({
      where: {
        id: params.menuItemId,
        isDishOfTheDay: true,
        dishOfTheDayQty: { gte: params.quantity },
      },
      data: {
        dishOfTheDayQty: { decrement: params.quantity },
      },
    });
    if (updated.count !== 1) {
      return { unitPrice: params.regularUnitPrice, dealType: null };
    }
    const after = await db.menuItem.findUnique({
      where: { id: params.menuItemId },
      select: { dishOfTheDayQty: true },
    });
    if (after?.dishOfTheDayQty != null && after.dishOfTheDayQty <= 0) {
      await db.menuItem.update({
        where: { id: params.menuItemId },
        data: { isDishOfTheDay: false },
      });
    }
  }

  return {
    unitPrice: params.dishOfTheDayPrice,
    dealType: "dish_of_the_day",
  };
}

/**
 * Resolve unit price for an order line: flash offer > dish of the day > regular.
 * Mutates quantity on flash offer / dish of the day when applicable.
 */
export async function resolveDealUnitPrice(params: DealPriceParams): Promise<{
  unitPrice: Prisma.Decimal;
  dealType: "flash" | "dish_of_the_day" | null;
}> {
  const selected = await selectDealUnitPrice(params);

  if (selected.dealType === "flash" && selected.flashOfferId) {
    const updated = await db.flashOffer.updateMany({
      where: {
        id: selected.flashOfferId,
        status: FlashOfferStatus.ACTIVE,
        quantityLeft: { gte: params.quantity },
      },
      data: {
        quantityLeft: { decrement: params.quantity },
      },
    });

    if (updated.count === 1) {
      const after = await db.flashOffer.findUnique({
        where: { id: selected.flashOfferId },
      });
      if (after && after.quantityLeft <= 0) {
        await db.flashOffer.update({
          where: { id: selected.flashOfferId },
          data: { status: FlashOfferStatus.ENDED, endedReason: "SOLD_OUT" },
        });
      }
      return { unitPrice: selected.unitPrice, dealType: "flash" };
    }
  } else if (selected.dealType === "dish_of_the_day") {
    const dish = await takeDishOfTheDay(params);
    return dish ?? { unitPrice: params.regularUnitPrice, dealType: null };
  } else {
    return { unitPrice: params.regularUnitPrice, dealType: null };
  }

  const dish = await takeDishOfTheDay(params);
  return dish ?? { unitPrice: params.regularUnitPrice, dealType: null };
}
