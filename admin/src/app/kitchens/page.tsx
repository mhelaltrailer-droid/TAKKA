import Link from "next/link";
import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";

import { db } from "@/lib/db";

export default async function KitchensPage() {
  const kitchens = await db.kitchen.findMany({
    where: {
      approvalStatus: ApprovalStatus.APPROVED,
      availabilityStatus: AvailabilityStatus.OPEN,
    },
    include: {
      region: true,
      _count: {
        select: {
          menuItems: true,
          reviews: true,
        },
      },
    },
    orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Customer Browse
          </p>
          <h1 className="mt-2 text-3xl font-bold">المطابخ المتاحة</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            هذه واجهة ويب أولية لجهة العميل، تعرض المطابخ المفتوحة والمعتمدة
            والمنيو الخاص بكل مطبخ.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {kitchens.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              لا توجد مطابخ معتمدة ومفتوحة حاليًا.
            </div>
          ) : (
            kitchens.map((kitchen) => (
              <article
                key={kitchen.id}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">{kitchen.kitchenName}</h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                      مفتوح
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-zinc-600">
                    {kitchen.description || "لا يوجد وصف للمطبخ بعد."}
                  </p>
                  <div className="text-sm text-zinc-600">
                    <p>
                      {kitchen.region.cityName} - {kitchen.region.regionName}
                    </p>
                    <p>
                      التقييم: {kitchen.averageRating.toFixed(1)} | التعليقات:{" "}
                      {kitchen._count.reviews}
                    </p>
                    <p>عدد الأصناف: {kitchen._count.menuItems}</p>
                  </div>
                  <Link
                    href={`/kitchens/${kitchen.slug}`}
                    className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
                  >
                    عرض المطبخ
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
