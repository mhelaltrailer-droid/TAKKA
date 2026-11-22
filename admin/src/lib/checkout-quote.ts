import {
  ApprovalStatus,
  DeliveryType,
  FlashOfferStatus,
  Prisma,
} from "@prisma/client";

import {
  annotateCheckoutLines,
  roundMoney,
  type CheckoutItemInput,
  type CheckoutQuoteBody,
  type CheckoutQuoteLine,
  type NormalizedCheckout,
} from "@/lib/checkout-quote-model";
import { db } from "@/lib/db";
import { resolveDealUnitPrice, selectDealUnitPrice } from "@/lib/deals";
import {
  kitchenAcceptsOrders,
  unavailableOrderError,
} from "@/lib/kitchen-order-rules";
import { isValidLatLng } from "@/lib/maps";
import { effectiveCatalogPriceDecimal } from "@/lib/pricing";
import { outsideServiceAreaMessage } from "@/lib/service-area-store";

const DELIVERY_PIN_REQUIRED =
  "موقع التوصيل مطلوب. فعّل الموقع أو حدّد نقطة على الخريطة ثم أكّدها قبل إرسال الطلب.";

const ITEMS_UNAVAILABLE = "بعض الأصناف غير متاحة أو لا تتبع هذا المطبخ.";

const DEPOSIT_CAP = "إجمالي العربون لا يجب أن يتجاوز 60% من قيمة الطلب.";

const ADDRESS_REQUIRED = "عنوان التوصيل مطلوب.";

type MenuRow = Prisma.MenuItemGetPayload<{
  include: {
    sizes: true;
    flashOffers: { select: { id: true } };
  };
}>;

type DealParams = {
  kitchenId: string;
  menuItemId: string;
  quantity: number;
  regularUnitPrice: Prisma.Decimal;
  isDishOfTheDay: boolean;
  dishOfTheDayPrice: Prisma.Decimal | null;
  dishOfTheDayQty: number | null;
};

type StockLedger = {
  flashClaimed: Map<string, number>;
  dishClaimed: Map<string, number>;
};

function dishStillApplies(
  item: MenuRow,
  quantity: number,
  ledger: StockLedger,
) {
  if (!item.isDishOfTheDay || item.dishOfTheDayPrice == null) {
    return false;
  }
  if (item.dishOfTheDayQty == null) {
    return true;
  }
  const claimed = ledger.dishClaimed.get(item.id) ?? 0;
  return item.dishOfTheDayQty - claimed >= quantity;
}

function claimDish(item: MenuRow, quantity: number, ledger: StockLedger) {
  ledger.dishClaimed.set(
    item.id,
    (ledger.dishClaimed.get(item.id) ?? 0) + quantity,
  );
}

type PricedLine = {
  input: CheckoutItemInput;
  itemName: string;
  sizeName: string | null;
  menuItemSizeId: string | null;
  quantity: number;
  available: boolean;
  availability: CheckoutQuoteLine["availability"];
  reason: string | null;
  unitPrice: Prisma.Decimal | null;
  depositAmount: Prisma.Decimal | null;
  commitDeal: DealParams | null;
};

export type CheckoutOrderLine = {
  menuItemId: string;
  menuItemSizeId: string | null;
  itemNameSnapshot: string;
  sizeNameSnapshot: string | null;
  unitPrice: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  quantity: number;
  lineTotal: Prisma.Decimal;
  customerNote: string | null;
};

export type BuiltCheckoutQuote = {
  body: CheckoutQuoteBody;
  orderable: boolean;
  httpStatus: number;
  blockingError: string | null;
  kitchenId: string | null;
  regionId: string | null;
  kitchenOwnerUserId: string | null;
  deliveryType: DeliveryType;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  customerAddressId: string | null;
  orderItems: CheckoutOrderLine[];
  subtotalAmount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
};

function toMoney(value: Prisma.Decimal | number) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

function moneyNumber(value: Prisma.Decimal) {
  return roundMoney(Number(value.toString()));
}

function emptyKitchen(): CheckoutQuoteBody["kitchen"] {
  return {
    id: null,
    availabilityStatus: null,
    suspended: false,
    approvalStatus: null,
    orderable: false,
    message: "المطبخ غير موجود.",
  };
}

function itemIsListed(item: MenuRow) {
  return (
    item.approvalStatus === ApprovalStatus.APPROVED &&
    (item.isAvailable ||
      item.isDishOfTheDay ||
      item.flashOffers.length > 0)
  );
}

async function priceLine(
  kitchenId: string,
  input: CheckoutItemInput,
  menuItem: MenuRow | undefined,
  ledger: StockLedger,
): Promise<PricedLine> {
  const quantity = input.quantity ?? 0;
  const base = {
    input,
    itemName: menuItem?.name ?? "صنف",
    sizeName: null as string | null,
    menuItemSizeId: input.menuItemSizeId,
    quantity: input.quantity ?? 0,
    available: false,
    availability: "unavailable" as const,
    reason: null as string | null,
    unitPrice: null as Prisma.Decimal | null,
    depositAmount: null as Prisma.Decimal | null,
    commitDeal: null as DealParams | null,
  };

  if (!input.menuItemId || !menuItem) {
    return {
      ...base,
      reason: "صنف لم يعد متاحًا أو لا يتبع هذا المطبخ.",
    };
  }

  if (input.quantity == null) {
    return {
      ...base,
      reason: `الكمية غير صحيحة للصنف "${menuItem.name}".`,
    };
  }

  let selectedSize: MenuRow["sizes"][number] | null = null;
  if (input.menuItemSizeId) {
    const size = menuItem.sizes.find((entry) => entry.id === input.menuItemSizeId);
    if (!size) {
      return {
        ...base,
        reason: `الحجم المختار لم يعد متاحًا للصنف "${menuItem.name}".`,
      };
    }
    if (!size.isActive) {
      return {
        ...base,
        sizeName: size.sizeName,
        availability: "inactive",
        reason: `${menuItem.name} (${size.sizeName}): غير نشط وتم حذفه من السلة.`,
      };
    }
    selectedSize = size;
  }

  if (menuItem.approvalStatus !== ApprovalStatus.APPROVED) {
    return {
      ...base,
      sizeName: selectedSize?.sizeName ?? null,
      reason: `الصنف "${menuItem.name}" غير متاح.`,
    };
  }

  if (!itemIsListed(menuItem)) {
    return {
      ...base,
      sizeName: selectedSize?.sizeName ?? null,
      availability: "inactive",
      reason: `${menuItem.name}${
        selectedSize ? ` (${selectedSize.sizeName})` : ""
      }: غير نشط وتم حذفه من السلة.`,
    };
  }

  const regularUnitPrice = selectedSize
    ? effectiveCatalogPriceDecimal(selectedSize.price, selectedSize.discountedPrice)
    : effectiveCatalogPriceDecimal(menuItem.basePrice, menuItem.discountedPrice);
  const depositAmount = selectedSize?.depositAmount ?? menuItem.depositAmount;
  const dealParams: DealParams = {
    kitchenId,
    menuItemId: menuItem.id,
    quantity,
    regularUnitPrice,
    isDishOfTheDay: menuItem.isDishOfTheDay,
    dishOfTheDayPrice: menuItem.dishOfTheDayPrice,
    dishOfTheDayQty: menuItem.dishOfTheDayQty,
  };

  let unitPrice = regularUnitPrice;
  if (!selectedSize) {
    const selected = await selectDealUnitPrice(dealParams);
    const flashFits =
      selected.dealType === "flash" &&
      selected.flashOfferId != null &&
      selected.flashQuantityLeft != null &&
      selected.flashQuantityLeft -
        (ledger.flashClaimed.get(selected.flashOfferId) ?? 0) >=
        quantity;
    if (flashFits && selected.flashOfferId) {
      ledger.flashClaimed.set(
        selected.flashOfferId,
        (ledger.flashClaimed.get(selected.flashOfferId) ?? 0) + quantity,
      );
      unitPrice = selected.unitPrice;
    } else if (
      (selected.dealType === "dish_of_the_day" || selected.dealType === "flash") &&
      dishStillApplies(menuItem, quantity, ledger) &&
      menuItem.dishOfTheDayPrice != null
    ) {
      claimDish(menuItem, quantity, ledger);
      unitPrice = menuItem.dishOfTheDayPrice;
    } else if (selected.dealType === "flash" || selected.dealType === "dish_of_the_day") {
      unitPrice = regularUnitPrice;
    } else {
      unitPrice = selected.unitPrice;
    }
  }

  return {
    input,
    itemName: menuItem.name,
    sizeName: selectedSize?.sizeName ?? null,
    menuItemSizeId: selectedSize?.id ?? null,
    quantity,
    available: true,
    availability: "available",
    reason: null,
    unitPrice: toMoney(unitPrice),
    depositAmount: toMoney(depositAmount),
    commitDeal: selectedSize ? null : dealParams,
  };
}

function summarize(
  lines: PricedLine[],
  kitchen: CheckoutQuoteBody["kitchen"],
  locationError: string | null,
  addressError: string | null,
): {
  body: CheckoutQuoteBody;
  orderable: boolean;
  httpStatus: number;
  blockingError: string | null;
  subtotalAmount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  orderItems: CheckoutOrderLine[];
} {
  const subtotalAmount = lines.reduce(
    (sum, line) =>
      line.available && line.unitPrice
        ? sum.add(line.unitPrice.mul(line.quantity))
        : sum,
    new Prisma.Decimal(0),
  );
  const depositAmount = lines.reduce(
    (sum, line) =>
      line.available && line.depositAmount
        ? sum.add(line.depositAmount.mul(line.quantity))
        : sum,
    new Prisma.Decimal(0),
  );
  const depositError = depositAmount.gt(subtotalAmount.mul(0.6))
    ? DEPOSIT_CAP
    : null;

  const annotated = annotateCheckoutLines(
    lines.map((line) => ({
      menuItemId: line.input.menuItemId,
      menuItemSizeId: line.menuItemSizeId,
      itemName: line.itemName,
      sizeName: line.sizeName,
      quantity: line.quantity,
      unitPrice: line.unitPrice ? moneyNumber(line.unitPrice) : null,
      depositAmount: line.depositAmount ? moneyNumber(line.depositAmount) : null,
      lineTotal:
        line.available && line.unitPrice
          ? moneyNumber(line.unitPrice.mul(line.quantity))
          : null,
      available: line.available,
      availability: line.availability,
      reason: line.reason,
      expectedUnitPrice: line.input.expectedUnitPrice,
      expectedDepositAmount: line.input.expectedDepositAmount,
    })),
  );

  const linesOk = lines.length > 0 && lines.every((line) => line.available);
  let blockingError: string | null = null;
  let httpStatus = 200;
  if (!kitchen.id) {
    blockingError = kitchen.message;
    httpStatus = 404;
  } else if (!kitchen.orderable) {
    blockingError = kitchen.message;
    httpStatus = 400;
  } else if (addressError) {
    blockingError = addressError;
    httpStatus = 400;
  } else if (locationError) {
    blockingError = locationError;
    httpStatus = 400;
  } else if (!linesOk) {
    blockingError = ITEMS_UNAVAILABLE;
    httpStatus = 400;
  } else if (depositError) {
    blockingError = depositError;
    httpStatus = 400;
  }

  const orderable = blockingError == null;
  const orderItems: CheckoutOrderLine[] = orderable
    ? lines.map((line) => ({
        menuItemId: line.input.menuItemId,
        menuItemSizeId: line.menuItemSizeId,
        itemNameSnapshot: line.itemName,
        sizeNameSnapshot: line.sizeName,
        unitPrice: line.unitPrice ?? new Prisma.Decimal(0),
        depositAmount: line.depositAmount ?? new Prisma.Decimal(0),
        quantity: line.quantity,
        lineTotal: toMoney(
          (line.unitPrice ?? new Prisma.Decimal(0)).mul(line.quantity),
        ),
        customerNote: line.input.customerNote,
      }))
    : [];

  return {
    body: {
      orderable,
      blockingError,
      kitchen,
      locationError,
      depositError,
      subtotal: moneyNumber(toMoney(subtotalAmount)),
      deposit: moneyNumber(toMoney(depositAmount)),
      lines: annotated.lines,
      changes: annotated.changes,
    },
    orderable,
    httpStatus,
    blockingError,
    subtotalAmount: toMoney(subtotalAmount),
    depositAmount: toMoney(depositAmount),
    orderItems,
  };
}

export async function buildCheckoutQuote(
  checkout: NormalizedCheckout,
  options: { commitDeals?: boolean } = {},
): Promise<BuiltCheckoutQuote> {
  const commitDeals = options.commitDeals === true;
  const deliveryType =
    checkout.deliveryType === "delivery"
      ? DeliveryType.DELIVERY
      : DeliveryType.PICKUP;

  const kitchen = await db.kitchen.findUnique({
    where: { id: checkout.kitchenId },
    select: {
      id: true,
      ownerUserId: true,
      regionId: true,
      availabilityStatus: true,
      approvalStatus: true,
      suspendedAt: true,
    },
  });

  const shell = {
    deliveryType,
    deliveryLatitude: null as number | null,
    deliveryLongitude: null as number | null,
    customerAddressId: checkout.customerAddressId,
    kitchenId: kitchen?.id ?? null,
    regionId: kitchen?.regionId ?? null,
    kitchenOwnerUserId: kitchen?.ownerUserId ?? null,
  };

  if (!kitchen) {
    const summary = summarize([], emptyKitchen(), null, null);
    return { ...shell, ...summary };
  }

  const suspended = kitchen.suspendedAt != null;
  const kitchenOrderable =
    kitchen.approvalStatus === ApprovalStatus.APPROVED &&
    kitchenAcceptsOrders({
      approvalStatus: kitchen.approvalStatus,
      availabilityStatus: kitchen.availabilityStatus,
      suspended,
    });
  const kitchenMessage =
    kitchen.approvalStatus !== ApprovalStatus.APPROVED
      ? "هذا المطبخ غير متاح للطلبات حاليًا."
      : kitchenOrderable
        ? null
        : unavailableOrderError({
            availabilityStatus: kitchen.availabilityStatus,
            suspended,
          });
  const kitchenQuote: CheckoutQuoteBody["kitchen"] = {
    id: kitchen.id,
    availabilityStatus: kitchen.availabilityStatus,
    suspended,
    approvalStatus: kitchen.approvalStatus,
    orderable: kitchenOrderable,
    message: kitchenMessage,
  };

  let addressError: string | null = null;
  let locationError: string | null = null;
  let deliveryLatitude: number | null = null;
  let deliveryLongitude: number | null = null;
  if (deliveryType === DeliveryType.DELIVERY) {
    if (!checkout.customerAddressId) {
      addressError = ADDRESS_REQUIRED;
    }
    if (
      !isValidLatLng(checkout.deliveryLatitude, checkout.deliveryLongitude)
    ) {
      locationError = DELIVERY_PIN_REQUIRED;
    } else {
      deliveryLatitude = Number(checkout.deliveryLatitude);
      deliveryLongitude = Number(checkout.deliveryLongitude);
      locationError = await outsideServiceAreaMessage(
        deliveryLatitude,
        deliveryLongitude,
      );
    }
  }

  const requestedIds = [
    ...new Set(
      checkout.items
        .map((item) => item.menuItemId)
        .filter((id) => id.length > 0),
    ),
  ];
  const menuItems = requestedIds.length
    ? await db.menuItem.findMany({
        where: {
          id: { in: requestedIds },
          kitchenId: kitchen.id,
        },
        include: {
          sizes: true,
          flashOffers: {
            where: {
              status: FlashOfferStatus.ACTIVE,
              endsAt: { gt: new Date() },
              quantityLeft: { gt: 0 },
            },
            select: { id: true },
          },
        },
      })
    : [];
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  const ledger: StockLedger = {
    flashClaimed: new Map(),
    dishClaimed: new Map(),
  };
  const priced: PricedLine[] = [];
  for (const item of checkout.items) {
    priced.push(
      await priceLine(kitchen.id, item, byId.get(item.menuItemId), ledger),
    );
  }

  let summary = summarize(
    priced,
    kitchenQuote,
    locationError,
    addressError,
  );

  if (commitDeals && summary.orderable) {
    const committed: PricedLine[] = [];
    for (const line of priced) {
      if (!line.commitDeal || !line.unitPrice || !line.depositAmount) {
        committed.push(line);
        continue;
      }
      const resolved = await resolveDealUnitPrice(line.commitDeal);
      committed.push({
        ...line,
        unitPrice: toMoney(resolved.unitPrice),
        commitDeal: null,
      });
    }
    summary = summarize(committed, kitchenQuote, locationError, addressError);
  }

  return {
    ...shell,
    deliveryLatitude,
    deliveryLongitude,
    ...summary,
  };
}
