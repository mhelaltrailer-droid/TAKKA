import Link from "next/link";

import { requireRole } from "@/lib/auth";
import {
  formatMoneyEg,
  getAllKitchensOrderStats,
  getOrderStatsSummary,
  resolveStatsDateRange,
} from "@/lib/kitchen-order-stats";

import { AnalyticsRangeForm } from "./analytics-range-form";

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
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-5 text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const range = resolveStatsDateRange(params);

  const [platform, kitchens] = await Promise.all([
    getOrderStatsSummary({ range }),
    getAllKitchensOrderStats(range),
  ]);

  const sorted = [...kitchens].sort(
    (a, b) => b.totalOrders - a.totalOrders || a.kitchenName.localeCompare(b.kitchenName, "ar"),
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            إحصائيات التشغيل
          </p>
          <h1 className="mt-2 text-3xl font-bold">تحليل المطابخ والطلبات</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            إجمالي المنصة وتفصيل كل مطبخ. الفترة الافتراضية آخر 30 يومًا مع
            إمكانية تحديد مدة مخصصة.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
          </div>
        </header>

        <AnalyticsRangeForm fromKey={range.fromKey} toKey={range.toKey} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="إجمالي الطلبات" value={platform.totalOrders} />
          <StatCard label="مكتملة (تم التسليم)" value={platform.completed} />
          <StatCard
            label="ملغاة"
            value={platform.cancelledTotal}
            hint={`رفض مطبخ: ${platform.rejectedByKitchen} · إلغاء عميل: ${platform.cancelledByCustomer}`}
          />
          <StatCard
            label="مبيعات المكتملة"
            value={formatMoneyEg(platform.salesCompleted)}
            hint={`معدل الإكمال: ${platform.completionRate}% · قيد التنفيذ: ${platform.inProgress}`}
          />
          <StatCard
            label="مشاهدات المطابخ"
            value={platform.viewsTotal}
            hint={`زوار فريدون: ${platform.uniqueVisitors}`}
          />
          <StatCard
            label="نسبة التحويل"
            value={`${platform.conversionRate}%`}
            hint="طلبات ÷ زوار فريدون"
          />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">إحصائيات كل مطبخ</h2>
          <p className="mt-1 text-sm text-zinc-600">
            من {range.fromKey} إلى {range.toKey}
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-right text-zinc-500">
                  <th className="px-3 py-2 font-medium">المطبخ</th>
                  <th className="px-3 py-2 font-medium">الحي</th>
                  <th className="px-3 py-2 font-medium">طلبات</th>
                  <th className="px-3 py-2 font-medium">مكتملة</th>
                  <th className="px-3 py-2 font-medium">ملغاة</th>
                  <th className="px-3 py-2 font-medium">تفصيل الإلغاء</th>
                  <th className="px-3 py-2 font-medium">قيد التنفيذ</th>
                  <th className="px-3 py-2 font-medium">مبيعات</th>
                  <th className="px-3 py-2 font-medium">مشاهدات</th>
                  <th className="px-3 py-2 font-medium">زوار</th>
                  <th className="px-3 py-2 font-medium">تحويل %</th>
                  <th className="px-3 py-2 font-medium">إكمال %</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-8 text-center text-zinc-500"
                    >
                      لا توجد مطابخ بعد.
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => (
                    <tr
                      key={row.kitchenId}
                      className="border-b border-zinc-100 align-top"
                    >
                      <td className="px-3 py-3 font-medium">
                        {row.kitchenName}
                      </td>
                      <td className="px-3 py-3 text-zinc-600">
                        {row.regionName}
                      </td>
                      <td className="px-3 py-3">{row.totalOrders}</td>
                      <td className="px-3 py-3 text-emerald-700">
                        {row.completed}
                      </td>
                      <td className="px-3 py-3 text-red-700">
                        {row.cancelledTotal}
                      </td>
                      <td className="px-3 py-3 text-xs leading-5 text-zinc-600">
                        رفض مطبخ: {row.rejectedByKitchen}
                        <br />
                        إلغاء عميل: {row.cancelledByCustomer}
                      </td>
                      <td className="px-3 py-3">{row.inProgress}</td>
                      <td className="px-3 py-3">
                        {formatMoneyEg(row.salesCompleted)}
                      </td>
                      <td className="px-3 py-3">{row.viewsTotal}</td>
                      <td className="px-3 py-3">{row.uniqueVisitors}</td>
                      <td className="px-3 py-3">{row.conversionRate}%</td>
                      <td className="px-3 py-3">{row.completionRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
