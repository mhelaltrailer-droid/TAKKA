import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";
import { menuItemNeedsAdminReviewWhere } from "@/lib/moderation";

export default async function AdminKitchensQueuePage() {
  await requireRole(["admin"]);

  const kitchens = await db.kitchen.findMany({
    where: { approvalStatus: "PENDING" },
    include: {
      region: true,
      owner: {
        select: { fullName: true, email: true, phoneNumber: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const pendingMenuCount = await db.menuItem.count({
    where: menuItemNeedsAdminReviewWhere(),
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            مراجعة المطابخ
          </p>
          <h1 className="mt-2 text-3xl font-bold">اعتماد المطابخ الجديدة</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            راجع بيانات المطبخ والصور والمستندات ثم اعتمد أو ارفض مع ذكر السبب.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
            <Link
              href="/dashboard/admin/menu-items"
              className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              مراجعة الأصناف ({pendingMenuCount})
            </Link>
          </div>
        </header>

        <section className="space-y-4">
          {kitchens.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              لا توجد مطابخ بانتظار الاعتماد.
            </div>
          ) : (
            kitchens.map((kitchen) => (
              <article
                key={kitchen.id}
                className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{kitchen.kitchenName}</h2>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      {getApprovalStatusLabel(kitchen.approvalStatus)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {kitchen.owner.fullName} ·{" "}
                    {kitchen.owner.email || kitchen.owner.phoneNumber || "—"}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {kitchen.region.cityName} - {kitchen.region.regionName}
                  </p>
                </div>
                <Link
                  href={`/dashboard/admin/kitchens/${kitchen.id}`}
                  className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  عرض التفاصيل والمراجعة
                </Link>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
