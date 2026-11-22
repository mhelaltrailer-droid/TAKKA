import { effectiveCatalogPrice } from "@/lib/pricing";
import {
  REORDER_BUSY_MESSAGE,
  REORDER_CLOSED_MESSAGE,
  type AvailabilityCode,
} from "@/lib/kitchen-order-rules";

export type ReorderKitchenInput = {
  id: string;
  kitchenName: string;
  slug: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  availabilityStatus: AvailabilityCode;
  suspended?: boolean;
  latitude: number | null;
  longitude: number | null;
  addressLine: string;
  regionLabel: string;
};

export type ReorderSourceItem = {
  menuItemId: string;
  menuItemSizeId: string | null;
  itemNameSnapshot: string;
  sizeNameSnapshot: string | null;
  unitPrice: number;
  quantity: number;
  customerNote: string | null;
};

export type ReorderMenuSize = {
  id: string;
  sizeName: string;
  price: number;
  discountedPrice: number | null;
  depositAmount: number | null;
  isActive: boolean;
};

export type ReorderMenuItem = {
  id: string;
  name: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  isAvailable: boolean;
  isDishOfTheDay: boolean;
  dishOfTheDayPrice: number | null;
  dishOfTheDayQty: number | null;
  basePrice: number;
  discountedPrice: number | null;
  depositAmount: number;
  orderReadiness: string;
  sizes: ReorderMenuSize[];
  flash: { offerPrice: number; quantityLeft: number } | null;
};

export type ReorderPreviewItem = {
  menuItemId: string;
  menuItemName: string;
  menuItemSizeId: string | null;
  sizeName: string | null;
  quantity: number;
  customerNote: string | null;
  unitPrice: number;
  previousUnitPrice: number;
  depositAmount: number;
  orderReadiness: string;
  priceChanged: boolean;
};

export type ReorderPreview = {
  kitchenAvailable: boolean;
  message: string | null;
  kitchen: {
    id: string;
    kitchenName: string;
    slug: string;
    latitude: number | null;
    longitude: number | null;
    addressLine: string;
    regionLabel: string;
  } | null;
  items: ReorderPreviewItem[];
  removed: Array<{ name: string; reason: string }>;
  notices: string[];
};

const UNAVAILABLE_MESSAGE =
  "المطبخ مش متاح دلوقتي. جرّب مطبخ تاني أو ارجع بعدين.";
const EMPTY_MESSAGE = "مفيش أصناف من الطلب ده متاحة دلوقتي.";

function money(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2);
  return `${text} جنيه`;
}

function lineLabel(name: string, sizeName: string | null) {
  return sizeName ? `${name} (${sizeName})` : name;
}

function kitchenView(kitchen: ReorderKitchenInput) {
  return {
    id: kitchen.id,
    kitchenName: kitchen.kitchenName,
    slug: kitchen.slug,
    latitude: kitchen.latitude,
    longitude: kitchen.longitude,
    addressLine: kitchen.addressLine,
    regionLabel: kitchen.regionLabel,
  };
}

function itemAvailable(item: ReorderMenuItem) {
  if (item.approvalStatus !== "APPROVED") return false;
  if (item.isAvailable) return true;
  if (item.isDishOfTheDay) return true;
  return Boolean(item.flash && item.flash.quantityLeft > 0);
}

function currentUnitPrice(
  item: ReorderMenuItem,
  size: ReorderMenuSize | null,
  quantity: number,
) {
  if (size) {
    return effectiveCatalogPrice(size.price, size.discountedPrice);
  }
  if (item.flash && item.flash.quantityLeft >= quantity) {
    return item.flash.offerPrice;
  }
  if (
    item.isDishOfTheDay &&
    item.dishOfTheDayPrice != null &&
    item.dishOfTheDayPrice > 0 &&
    (item.dishOfTheDayQty == null || item.dishOfTheDayQty >= quantity)
  ) {
    return item.dishOfTheDayPrice;
  }
  return effectiveCatalogPrice(item.basePrice, item.discountedPrice);
}

export function buildReorderPreview(input: {
  kitchen: ReorderKitchenInput | null;
  orderItems: ReorderSourceItem[];
  menuItems: ReorderMenuItem[];
}): ReorderPreview {
  const kitchen = input.kitchen;
  const notAccepting =
    !kitchen ||
    kitchen.approvalStatus !== "APPROVED" ||
    kitchen.suspended === true ||
    kitchen.availabilityStatus !== "OPEN";
  if (notAccepting) {
    const missingOrRejected = !kitchen || kitchen.approvalStatus !== "APPROVED";
    const busy =
      Boolean(kitchen) &&
      !missingOrRejected &&
      (kitchen?.suspended === true || kitchen?.availabilityStatus === "BUSY");
    return {
      kitchenAvailable: false,
      message: missingOrRejected
        ? UNAVAILABLE_MESSAGE
        : busy
          ? REORDER_BUSY_MESSAGE
          : REORDER_CLOSED_MESSAGE,
      kitchen: kitchen ? kitchenView(kitchen) : null,
      items: [],
      removed: [],
      notices: [],
    };
  }

  const menuById = new Map(input.menuItems.map((item) => [item.id, item]));
  const items: ReorderPreviewItem[] = [];
  const removed: Array<{ name: string; reason: string }> = [];
  const notices: string[] = [];

  for (const source of input.orderItems) {
    const label = lineLabel(source.itemNameSnapshot, source.sizeNameSnapshot);
    const menuItem = menuById.get(source.menuItemId);
    if (!menuItem) {
      removed.push({ name: label, reason: "اتشال من المنيو" });
      notices.push(`اتشال «${label}» لأنه اتشال من المنيو.`);
      continue;
    }
    if (!itemAvailable(menuItem)) {
      const reason =
        menuItem.approvalStatus === "APPROVED"
          ? "مش متاح دلوقتي"
          : "لسه مش معتمد";
      removed.push({ name: label, reason });
      notices.push(`اتشال «${label}» لأنه ${reason}.`);
      continue;
    }
    if (!Number.isInteger(source.quantity) || source.quantity <= 0) {
      removed.push({ name: label, reason: "الكمية مش صالحة" });
      notices.push(`اتشال «${label}» لأنه الكمية مش صالحة.`);
      continue;
    }

    const size = source.menuItemSizeId
      ? (menuItem.sizes.find((entry) => entry.id === source.menuItemSizeId) ??
        null)
      : null;
    if (source.menuItemSizeId && (!size || !size.isActive)) {
      removed.push({ name: label, reason: "الحجم مش متاح دلوقتي" });
      notices.push(`اتشال «${label}» لأنه الحجم مش متاح دلوقتي.`);
      continue;
    }

    const unitPrice = currentUnitPrice(menuItem, size, source.quantity);
    const previousUnitPrice = source.unitPrice;
    const priceChanged = Math.abs(unitPrice - previousUnitPrice) >= 0.01;
    const displayName = menuItem.name;
    const displaySize = size?.sizeName ?? null;
    const displayLabel = lineLabel(displayName, displaySize);
    if (priceChanged) {
      notices.push(
        `اتغير سعر «${displayLabel}»: كان ${money(previousUnitPrice)} وبقى ${money(unitPrice)}.`,
      );
    }

    items.push({
      menuItemId: menuItem.id,
      menuItemName: displayName,
      menuItemSizeId: size?.id ?? null,
      sizeName: displaySize,
      quantity: source.quantity,
      customerNote: source.customerNote?.trim() || null,
      unitPrice,
      previousUnitPrice,
      depositAmount: Number(
        size?.depositAmount ?? menuItem.depositAmount,
      ),
      orderReadiness: menuItem.orderReadiness || "AVAILABLE_NOW",
      priceChanged,
    });
  }

  return {
    kitchenAvailable: true,
    message: items.length === 0 ? EMPTY_MESSAGE : null,
    kitchen: kitchenView(kitchen),
    items,
    removed,
    notices,
  };
}
