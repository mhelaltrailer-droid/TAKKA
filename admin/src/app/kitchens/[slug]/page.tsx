import Link from "next/link";
import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";

import { db } from "@/lib/db";

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

  const paymentMethod = kitchen.paymentMethods[0];

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
          <div className="mt-4 text-sm text-zinc-600">
            <p>
              الموقع: {kitchen.region.cityName} - {kitchen.region.regionName}
            </p>
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
              href={`/kitchens/${kitchen.slug}/order`}
              className="inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white"
            >
              ابدأ الطلب من هذا المطبخ
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">المنيو</h2>
            <div className="mt-5 space-y-4">
              {kitchen.menuItems.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                  لا توجد أصناف متاحة حاليًا.
                </div>
              ) : (
                kitchen.menuItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-600">
                      {item.description || "لا يوجد وصف للصنف."}
                    </p>
                    <div className="mt-3 text-sm text-zinc-700">
                      <p>السعر: {String(item.basePrice)} جنيه</p>
                      <p>العربون: {String(item.depositAmount)} جنيه</p>
                    </div>
                    {item.sizes.length ? (
                      <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-3 text-xs text-zinc-600">
                        {item.sizes.map((size) => (
                          <div key={size.id}>
                            {size.sizeName}: {String(size.price)} جنيه
                            {size.depositAmount
                              ? ` | عربون ${String(size.depositAmount)}`
                              : ""}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
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
