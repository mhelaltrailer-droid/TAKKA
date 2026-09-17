import { Prisma } from "@prisma/client";

/**
 * Catalog unit price: discounted when set, otherwise base/list price.
 * Deals (flash / dish of the day) override this separately.
 */
export function effectiveCatalogPrice(
  basePrice: number,
  discountedPrice: number | null | undefined,
): number {
  if (
    discountedPrice != null &&
    Number.isFinite(discountedPrice) &&
    discountedPrice > 0 &&
    discountedPrice < basePrice
  ) {
    return discountedPrice;
  }
  return basePrice;
}

export function effectiveCatalogPriceDecimal(
  basePrice: Prisma.Decimal | number,
  discountedPrice: Prisma.Decimal | number | null | undefined,
): Prisma.Decimal {
  const base = Number(basePrice);
  const discounted =
    discountedPrice == null ? null : Number(discountedPrice);
  return new Prisma.Decimal(
    effectiveCatalogPrice(base, discounted).toFixed(2),
  );
}

/** Reject invalid optional discounted price. Empty/null is OK. */
export function parseOptionalDiscountedPrice(
  raw: string | number | null | undefined,
  basePrice: number,
  fieldLabel = "السعر بعد الخصم",
): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = typeof raw === "string" ? raw.trim() : String(raw);
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} يجب أن يكون أكبر من صفر.`);
  }
  if (parsed >= basePrice) {
    throw new Error(`${fieldLabel} يجب أن يكون أقل من السعر الأساسي.`);
  }
  return parsed.toFixed(2);
}

/** Cap for deposit: 60% of effective catalog price (discounted if set). */
export function maxDepositAllowed(
  basePrice: number,
  discountedPrice: number | null | undefined,
): number {
  return effectiveCatalogPrice(basePrice, discountedPrice) * 0.6;
}
