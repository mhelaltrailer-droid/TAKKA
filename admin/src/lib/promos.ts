import { db } from "@/lib/db";
import { DEFAULT_PROMO_BANNERS } from "@/lib/promo-defaults";

export async function ensureDefaultPromoBanners() {
  const count = await db.promoBanner.count();
  if (count > 0) {
    return;
  }

  await db.promoBanner.createMany({
    data: DEFAULT_PROMO_BANNERS.map((banner) => ({
      title: banner.title,
      subtitle: banner.subtitle ?? null,
      imageUrl: banner.imageUrl,
      priceLabel: banner.priceLabel ?? null,
      oldPriceLabel: banner.oldPriceLabel ?? null,
      sortOrder: banner.sortOrder,
      isActive: true,
    })),
  });
}

export async function listActivePromoBanners() {
  await ensureDefaultPromoBanners();

  return db.promoBanner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
