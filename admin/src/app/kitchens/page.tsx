import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { listActivePromoBanners } from "@/lib/promos";

import { KitchensBrowseClient } from "./kitchens-browse-client";

export default async function KitchensPage() {
  const { userId } = await auth();
  const [kitchens, promos] = await Promise.all([
    db.kitchen.findMany({
      where: {
        approvalStatus: ApprovalStatus.APPROVED,
        availabilityStatus: AvailabilityStatus.OPEN,
      },
      include: {
        region: true,
        menuItems: {
          where: { isAvailable: true },
          select: { name: true, categoryId: true },
          orderBy: { sortOrder: "asc" },
          take: 24,
        },
        _count: {
          select: {
            menuItems: true,
            reviews: true,
          },
        },
      },
      orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
    }),
    listActivePromoBanners().catch(() => []),
  ]);

  return (
    <AppShell
      mode="customer"
      title="المطابخ المتاحة"
      subtitle="اختر الحي في مدينة العبور ثم تصفّح المطابخ القريبة واطلب مباشرة."
      activeNav="home"
    >
      <KitchensBrowseClient
        isSignedIn={Boolean(userId)}
        promos={promos.map((banner) => ({
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          imageUrl: banner.imageUrl,
          priceLabel: banner.priceLabel,
          oldPriceLabel: banner.oldPriceLabel,
        }))}
        kitchens={kitchens.map((kitchen) => ({
          id: kitchen.id,
          slug: kitchen.slug,
          kitchenName: kitchen.kitchenName,
          description: kitchen.description,
          averageRating: kitchen.averageRating,
          region: {
            cityName: kitchen.region.cityName,
            regionName: kitchen.region.regionName,
          },
          menuItemsCount: kitchen._count.menuItems,
          reviewsCount: kitchen._count.reviews,
          menuItemNames: kitchen.menuItems.map((item) => item.name),
          menuItemCategoryIds: [
            ...new Set(kitchen.menuItems.map((item) => item.categoryId)),
          ],
        }))}
      />
    </AppShell>
  );
}
