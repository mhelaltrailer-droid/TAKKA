import Link from "next/link";
import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";

export default async function KitchensPage() {
  const { userId } = await auth();
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
    <AppShell
      mode="customer"
      title="المطابخ المتاحة"
      subtitle="نفس تجربة التطبيق: تصفّح المطابخ المعتمدة والمفتوحة واطلب مباشرة."
    >
      {!userId ? (
        <p className="mb-6 text-sm leading-7 text-[#6b4a3a]">
          تصفّح بحرية، و{" "}
          <Link href="/sign-up" className="font-semibold text-[var(--brand-secondary)]">
            أنشئ حسابًا
          </Link>{" "}
          برقم هاتف مصري لإتمام الطلب.
        </p>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {kitchens.length === 0 ? (
          <div className="border border-[#ead9c8] bg-white p-6 text-sm text-[#6b4a3a]">
            لا توجد مطابخ معتمدة ومفتوحة حاليًا.
          </div>
        ) : (
          kitchens.map((kitchen) => (
            <article
              key={kitchen.id}
              className="border border-[#ead9c8] bg-white p-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">{kitchen.kitchenName}</h2>
                  <span className="bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                    مفتوح
                  </span>
                </div>
                <p className="text-sm leading-7 text-[#6b4a3a]">
                  {kitchen.description || "لا يوجد وصف للمطبخ بعد."}
                </p>
                <div className="text-sm text-[#6b4a3a]">
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
                  className="inline-flex bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--brand-secondary)]"
                >
                  عرض المطبخ
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
