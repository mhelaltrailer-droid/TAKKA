import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  countNoResponseByKitchen,
  noResponseWindows,
} from "@/lib/kitchen-acceptance-sweep";
import { customerFacingAvailability } from "@/lib/kitchen-order-rules";
import { menuItemNeedsAdminReviewWhere } from "@/lib/moderation";
import {
  getApprovalStatusLabel,
  getAvailabilityStatusLabel,
} from "@/lib/status-labels";

import { reactivateKitchen } from "../kitchen-policy/actions";

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

  const [allKitchens, windows] = await Promise.all([
    db.kitchen.findMany({
      select: {
        id: true,
        kitchenName: true,
        approvalStatus: true,
        availabilityStatus: true,
        suspendedAt: true,
        suspensionLevel: true,
        region: { select: { cityName: true, regionName: true } },
      },
      orderBy: { kitchenName: "asc" },
    }),
    noResponseWindows(),
  ]);
  const kitchenIds = allKitchens.map((kitchen) => kitchen.id);
  const [shortCounts, longCounts] = await Promise.all([
    countNoResponseByKitchen({
      since: windows.shortSince,
      kitchenIds,
    }),
    countNoResponseByKitchen({
      since: windows.longSince,
      kitchenIds,
    }),
  ]);
  const operationalKitchens = [...allKitchens].sort((left, right) => {
    return Number(Boolean(right.suspendedAt)) - Number(Boolean(left.suspendedAt));
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
            <Link
              href="/dashboard/admin/kitchen-policy"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              قواعد قبول الطلبات
            </Link>
            <Link
              href="/dashboard/admin/kitchen-performance"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              أداء المطابخ
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

        <section className="space-y-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">حالة المطابخ</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              عدم الرد يعني إلغاء تلقائي فقط. الرفض اليدوي لا يُحسب. المطبخ
              الموقوف يظهر للعملاء مشغول. الحد الحالي:{" "}
              {windows.policy.shortWindowCount} خلال{" "}
              {windows.policy.shortWindowHours} ساعة، أو{" "}
              {windows.policy.longWindowCount} خلال{" "}
              {windows.policy.longWindowDays} يومًا.
            </p>
          </div>
          {operationalKitchens.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              لا توجد مطابخ.
            </div>
          ) : (
            operationalKitchens.map((kitchen) => {
              const customerStatus = customerFacingAvailability(
                kitchen.availabilityStatus,
                kitchen.suspendedAt != null,
              );
              const shortCount = shortCounts.get(kitchen.id) ?? 0;
              const longCount = longCounts.get(kitchen.id) ?? 0;
              return (
                <article
                  key={`ops-${kitchen.id}`}
                  className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">{kitchen.kitchenName}</h3>
                      <p className="text-sm text-zinc-600">
                        {kitchen.region.cityName} - {kitchen.region.regionName}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/admin/kitchens/${kitchen.id}`}
                      className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
                    >
                      التفاصيل
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-zinc-100 px-3 py-1">
                      {getApprovalStatusLabel(kitchen.approvalStatus)}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-3 py-1">
                      حالة المطبخ: {getAvailabilityStatusLabel(kitchen.availabilityStatus)}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
                      ظاهر للعميل: {getAvailabilityStatusLabel(customerStatus)}
                    </span>
                    {kitchen.suspendedAt ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                        {kitchen.suspensionLevel === "LEVEL_2"
                          ? "موقوف مستوى 2"
                          : "موقوف مستوى 1"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-700">
                    عدم رد خلال {windows.policy.shortWindowHours} ساعة: {shortCount} /{" "}
                    {windows.policy.shortWindowCount}
                    {" · "}
                    خلال {windows.policy.longWindowDays} يومًا: {longCount} /{" "}
                    {windows.policy.longWindowCount}
                  </p>
                  {kitchen.suspendedAt ? (
                    <form action={reactivateKitchen}>
                      <input type="hidden" name="kitchenId" value={kitchen.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        إعادة التفعيل
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
