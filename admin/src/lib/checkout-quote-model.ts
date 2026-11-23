export type CheckoutAvailability = "available" | "unavailable" | "inactive";

export type CheckoutChangeKind = "price" | "unavailable" | "inactive";

export type CheckoutItemInput = {
  menuItemId: string;
  quantity: number | null;
  menuItemSizeId: string | null;
  customerNote: string | null;
  /** Comparison only. Never used as the charged price. */
  expectedUnitPrice: number | null;
  /** Comparison only. Never used as the charged deposit. */
  expectedDepositAmount: number | null;
};

export type NormalizedCheckout = {
  kitchenId: string;
  deliveryType: "pickup" | "delivery";
  customerAddressId: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  items: CheckoutItemInput[];
};

export type CheckoutQuoteLine = {
  menuItemId: string;
  menuItemSizeId: string | null;
  itemName: string;
  sizeName: string | null;
  quantity: number;
  unitPrice: number | null;
  depositAmount: number | null;
  lineTotal: number | null;
  available: boolean;
  availability: CheckoutAvailability;
  reason: string | null;
  expectedUnitPrice: number | null;
  expectedDepositAmount: number | null;
  priceChanged: boolean;
  depositChanged: boolean;
};

export type CheckoutQuoteChange = {
  menuItemId: string;
  menuItemSizeId: string | null;
  itemName: string;
  kind: CheckoutChangeKind;
  message: string;
  previousUnitPrice: number | null;
  unitPrice: number | null;
};

export type CheckoutKitchenQuote = {
  id: string | null;
  availabilityStatus: "OPEN" | "BUSY" | "CLOSED" | null;
  suspended: boolean;
  approvalStatus: string | null;
  orderable: boolean;
  message: string | null;
};

export type CheckoutQuoteBody = {
  orderable: boolean;
  blockingError: string | null;
  kitchen: CheckoutKitchenQuote;
  locationError: string | null;
  depositError: string | null;
  subtotal: number;
  deposit: number;
  lines: CheckoutQuoteLine[];
  changes: CheckoutQuoteChange[];
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function readExpectedMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return roundMoney(parsed);
}

export function moneyDiffers(left: number, right: number) {
  return roundMoney(left) !== roundMoney(right);
}

export function formatEgp(value: number) {
  const rounded = roundMoney(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function checkoutItemLabel(name: string, sizeName: string | null) {
  const trimmed = name.trim() || "صنف";
  return sizeName?.trim() ? `${trimmed} (${sizeName.trim()})` : trimmed;
}

function readQuantity(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function readOptionalCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCheckoutPayload(
  raw: unknown,
): { ok: true; value: NormalizedCheckout } | { ok: false; error: string } {
  const payload =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const kitchenId =
    typeof payload.kitchenId === "string" ? payload.kitchenId.trim() : "";
  const itemsRaw = payload.items;
  if (!kitchenId || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    return { ok: false, error: "بيانات الطلب غير مكتملة." };
  }

  const items = itemsRaw.map((entry) => {
    const item =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : {};
    const sizeId =
      typeof item.menuItemSizeId === "string" ? item.menuItemSizeId.trim() : "";
    const note =
      typeof item.customerNote === "string" ? item.customerNote.trim() : "";
    return {
      menuItemId:
        typeof item.menuItemId === "string" ? item.menuItemId.trim() : "",
      quantity: readQuantity(item.quantity),
      menuItemSizeId: sizeId || null,
      customerNote: note || null,
      expectedUnitPrice: readExpectedMoney(item.expectedUnitPrice),
      expectedDepositAmount: readExpectedMoney(item.expectedDepositAmount),
    } satisfies CheckoutItemInput;
  });

  const customerAddressId =
    typeof payload.customerAddressId === "string"
      ? payload.customerAddressId.trim()
      : "";

  return {
    ok: true,
    value: {
      kitchenId,
      deliveryType: payload.deliveryType === "delivery" ? "delivery" : "pickup",
      customerAddressId: customerAddressId || null,
      deliveryLatitude: readOptionalCoord(payload.deliveryLatitude),
      deliveryLongitude: readOptionalCoord(payload.deliveryLongitude),
      items,
    },
  };
}

export function annotateCheckoutLines(
  lines: Array<
    Omit<CheckoutQuoteLine, "priceChanged" | "depositChanged">
  >,
): { lines: CheckoutQuoteLine[]; changes: CheckoutQuoteChange[] } {
  const annotated: CheckoutQuoteLine[] = [];
  const changes: CheckoutQuoteChange[] = [];

  for (const line of lines) {
    const label = checkoutItemLabel(line.itemName, line.sizeName);
    const priceChanged =
      line.available &&
      line.expectedUnitPrice != null &&
      line.unitPrice != null &&
      moneyDiffers(line.expectedUnitPrice, line.unitPrice);
    const depositChanged =
      line.available &&
      line.expectedDepositAmount != null &&
      line.depositAmount != null &&
      moneyDiffers(line.expectedDepositAmount, line.depositAmount);

    annotated.push({
      ...line,
      priceChanged,
      depositChanged,
    });

    if (!line.available) {
      changes.push({
        menuItemId: line.menuItemId,
        menuItemSizeId: line.menuItemSizeId,
        itemName: line.itemName,
        kind: line.availability === "inactive" ? "inactive" : "unavailable",
        message:
          line.reason ??
          `${label}: ${
            line.availability === "inactive"
              ? "غير نشط وتم حذفه من السلة."
              : "لم يعد متاحًا وتم حذفه من السلة."
          }`,
        previousUnitPrice: line.expectedUnitPrice,
        unitPrice: line.unitPrice,
      });
      continue;
    }

    if (priceChanged || depositChanged) {
      const parts: string[] = [];
      if (priceChanged && line.unitPrice != null && line.expectedUnitPrice != null) {
        parts.push(
          `السعر تغيّر من ${formatEgp(line.expectedUnitPrice)} إلى ${formatEgp(line.unitPrice)} ج.م`,
        );
      }
      if (
        depositChanged &&
        line.depositAmount != null &&
        line.expectedDepositAmount != null
      ) {
        parts.push(
          `العربون تغيّر من ${formatEgp(line.expectedDepositAmount)} إلى ${formatEgp(line.depositAmount)} ج.م`,
        );
      }
      changes.push({
        menuItemId: line.menuItemId,
        menuItemSizeId: line.menuItemSizeId,
        itemName: line.itemName,
        kind: "price",
        message: `${label}: ${parts.join("، ")}`,
        previousUnitPrice: line.expectedUnitPrice,
        unitPrice: line.unitPrice,
      });
    }
  }

  return { lines: annotated, changes };
}
