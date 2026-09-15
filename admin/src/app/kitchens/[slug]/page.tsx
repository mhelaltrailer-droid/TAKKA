import Link from "next/link";
import { ApprovalStatus, AvailabilityStatus, FlashOfferStatus } from "@prisma/client";

import { KitchenLocationActions } from "@/components/kitchen-location-actions";
import { KitchenMenuCart } from "@/components/kitchen-menu-cart";
import { db } from "@/lib/db";
import { expireStaleFlashOffers } from "@/lib/deals";

export default async function KitchenDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const kitchen = await db.kitchen.findFirst({
    where: {
      slug,
      approvalStatus: ApprovalStatus.APPROVED,
      availabilityStatus: AvailabilityStatus.OPEN,
    },
    include: {
      region: true,
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
      },
    },
  });

  if (!kitchen) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">المطبخ غير موجود</h1>
          <Link
            href="/kitchens"
            className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            العودة للمطابخ
          </Link>
        </div>
      </main>
    );
  }

  await expireStaleFlashOffers([kitchen.id]);
  const activeFlash = kitchen.flashOffers[0] ?? null;
  const paymentMethod = kitchen.paymentMethods[0];

  const dishItem =
    kitchen.menuItems.find((item) => item.isDishOfTheDay) ??
    (await db.menuItem.findFirst({
      where: {
        kitchenId: kitchen.id,
        isDishOfTheDay: true,
        approvalStatus: ApprovalStatus.APPROVED,
        dishOfTheDayPrice: { not: null },
        OR: [{ dishOfTheDayQty: null }, { dishOfTheDayQty: { gt: 0 } }],
      },
      include: {
        sizes: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }));

  let flashMenuItem =
    activeFlash != null
      ? kitchen.menuItems.find((item) => item.id === activeFlash.menuItemId)
      : null;
  if (activeFlash && !flashMenuItem) {
    flashMenuItem = await db.menuItem.findFirst({
      where: {
        id: activeFlash.menuItemId,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      include: {
        sizes: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  const cartItemsById = new Map(
    kitchen.menuItems.map((item) => [item.id, item]),
  );
  if (dishItem) cartItemsById.set(dishItem.id, dishItem);
  if (flashMenuItem) cartItemsById.set(flashMenuItem.id, flashMenuItem);
  const cartMenuItems = Array.from(cartItemsById.values());

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href="/kitchens"
            className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
          >
            العودة للمطابخ
          </Link>
          <h1 className="mt-3 text-3xl font-bold">{kitchen.kitchenName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            {kitchen.description || "لا يوجد وصف لهذا المطبخ بعد."}
          </p>
          <div className="mt-4 space-y-4 text-sm text-zinc-600">
            <p>
              الموقع: {kitchen.region.cityName} - {kitchen.region.regionName}
            </p>
            <KitchenLocationActions
              latitude={kitchen.latitude}
              longitude={kitchen.longitude}
              addressLine={kitchen.addressLine}
              regionLabel={`${kitchen.region.cityName} - ${kitchen.region.regionName}`}
            />
            <p>
              التقييم: {kitchen.averageRating.toFixed(1)} | عدد التقييمات:{" "}
              {kitchen.reviewsCount}
            </p>
            {paymentMethod ? (
              <p>
                طريقة العربون:{" "}
                {paymentMethod.accountNumberOrHandle ||
                  paymentMethod.paymentLink ||
                  "InstaPay"}
              </p>
            ) : null}
          </div>
          <div className="mt-5">
            <Link
              href="/cart"
              className="inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white"
            >
              مراجعة السلة
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <KitchenMenuCart
              kitchenId={kitchen.id}
              kitchenName={kitchen.kitchenName}
              kitchenSlug={kitchen.slug}
              kitchenLatitude={kitchen.latitude}
              kitchenLongitude={kitchen.longitude}
              kitchenAddressLine={kitchen.addressLine}
              kitchenRegionLabel={`${kitchen.region.cityName} - ${kitchen.region.regionName}`}
              menuItems={cartMenuItems.map((item) => {
                const isFlash =
                  activeFlash && activeFlash.menuItemId === item.id;
                return {
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  basePrice: String(item.basePrice),
                  depositAmount: String(item.depositAmount),
                  orderReadiness: item.orderReadiness,
                  isDishOfTheDay: item.isDishOfTheDay,
                  dishOfTheDayPrice: item.dishOfTheDayPrice
                    ? String(item.dishOfTheDayPrice)
                    : null,
                  dishOfTheDayQty: item.dishOfTheDayQty,
                  flashOfferPrice: isFlash
                    ? String(activeFlash.offerPrice)
                    : null,
                  flashOfferEndsAt: isFlash
                    ? activeFlash.endsAt.toISOString()
                    : null,
                  flashQuantityLeft: isFlash ? activeFlash.quantityLeft : null,
                  sizes: item.sizes.map((size) => ({
                    id: size.id,
                    sizeName: size.sizeName,
                    price: String(size.price),
                    depositAmount: size.depositAmount
                      ? String(size.depositAmount)
                      : null,
                  })),
                };
              })}
            />
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">آراء العملاء</h2>
            <div className="mt-5 space-y-4">
              {kitchen.reviews.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                  لا توجد تقييمات بعد.
                </div>
              ) : (
                kitchen.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">
                        {review.customer.fullName || "عميل"}
                      </p>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">
                        {review.ratingValue} / 5
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-3 text-sm leading-7 text-zinc-600">
                        {review.comment}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
