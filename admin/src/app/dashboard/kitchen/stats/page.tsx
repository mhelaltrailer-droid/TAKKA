import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatMoneyEg,
  getOrderStatsSummary,
  resolveStatsDateRange,
} from "@/lib/kitchen-order-stats";

import { KitchenStatsRangeForm } from "./stats-range-form";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#ead9c8] bg-white p-5">
      <p className="text-sm text-[#6b4a3a]">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-[#6b4a3a]">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function KitchenStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await requireAuth();
  if (user.role !== "kitchen_owner" && user.role !== "admin") {
    redirect("/forbidden");
  }

  const kitchen = await db.kitchen.findUnique({
    where: { ownerUserId: user.appUserId },
    select: { id: true, kitchenName: true },
  });

  if (!kitchen) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#ead9c8] bg-white p-6">
          <h1 className="text-2xl font-bold">إحصائيات</h1>
          <p className="mt-3 text-sm text-[#6b4a3a]">
            أكمل إعداد المطبخ أولاً لعرض الإحصائيات.
          </p>
          <Link
            href="/dashboard/kitchen/onboarding"
            className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            إعداد المطبخ
          </Link>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const range = resolveStatsDateRange(params);
  const stats = await getOrderStatsSummary({
    range,
    kitchenId: kitchen.id,
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-[#ead9c8] bg-white p-6">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            إحصائيات
          </p>
          <h1 className="mt-2 text-3xl font-bold">{kitchen.kitchenName}</h1>
          <p className="mt-3 text-sm leading-7 text-[#6b4a3a]">
            ملخص طلبات مطبخك فقط. الفترة الافتراضية آخر 30 يومًا.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="rounded-full border border-[#ead9c8] px-4 py-2 text-sm font-medium"
            >
              العودة للوحة
            </Link>
          </div>
        </header>

        <KitchenStatsRangeForm fromKey={range.fromKey} toKey={range.toKey} />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="إجمالي الطلبات" value={stats.totalOrders} />
          <StatCard label="مكتملة (تم التسليم)" value={stats.completed} />
          <StatCard
            label="ملغاة"
            value={stats.cancelledTotal}
            hint={`رفض مطبخ: ${stats.rejectedByKitchen} · إلغاء عميل: ${stats.cancelledByCustomer}`}
          />
          <StatCard label="قيد التنفيذ" value={stats.inProgress} />
          <StatCard
            label="مبيعات المكتملة"
            value={formatMoneyEg(stats.salesCompleted)}
          />
          <StatCard label="معدل الإكمال" value={`${stats.completionRate}%`} />
          <StatCard
            label="مشاهدات الصفحة"
            value={stats.viewsTotal}
            hint={`زوار فريدون: ${stats.uniqueVisitors}`}
          />
          <StatCard
            label="نسبة التحويل"
            value={`${stats.conversionRate}%`}
            hint="طلبات ÷ زوار فريدون"
          />
        </section>
      </div>
    </main>
  );
}
