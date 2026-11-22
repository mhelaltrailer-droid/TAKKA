import Link from "next/link";

import { requireRole } from "@/lib/auth";
import {
  formatMinutes,
  formatPercent,
} from "@/lib/kitchen-performance";
import { loadKitchenPerformance } from "@/lib/kitchen-performance-report";
import { resolveStatsDateRange } from "@/lib/kitchen-order-stats";

const SORTS = [
  "noResponse",
  "acceptanceRate",
  "received",
  "accepted",
  "rejected",
  "avgResponseMinutes",
  "rating",
  "complaints",
  "name",
] as const;

type SortKey = (typeof SORTS)[number];

function isSortKey(value: string | undefined): value is SortKey {
  return SORTS.includes(value as SortKey);
}

export default async function KitchenPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; sort?: string; dir?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const range = resolveStatsDateRange({ from: params.from, to: params.to });
  const sort: SortKey = isSortKey(params.sort) ? params.sort : "noResponse";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const rows = await loadKitchenPerformance(range);

  rows.sort((left, right) => {
    const direction = dir === "asc" ? 1 : -1;
    const number = (value: number | null) =>
      value == null ? (dir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : value;
    let delta = 0;
    switch (sort) {
      case "name":
        delta = left.kitchenName.localeCompare(right.kitchenName, "ar");
        break;
      case "received":
        delta = left.received - right.received;
        break;
      case "accepted":
        delta = left.accepted - right.accepted;
        break;
      case "rejected":
        delta = left.rejected - right.rejected;
        break;
      case "noResponse":
        delta = left.noResponse - right.noResponse;
        break;
      case "acceptanceRate":
        delta = number(left.acceptanceRate) - number(right.acceptanceRate);
        break;
      case "avgResponseMinutes":
        delta = number(left.avgResponseMinutes) - number(right.avgResponseMinutes);
        break;
      case "rating":
        delta = number(left.ratingAverage) - number(right.ratingAverage);
        break;
      case "complaints":
        delta = left.complaints - right.complaints;
        break;
    }
    return delta * direction;
  });

  function sortHref(key: SortKey) {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    const query = new URLSearchParams({
      from: range.fromKey,
      to: range.toKey,
      sort: key,
      dir: nextDir,
    });
    return `/dashboard/admin/kitchen-performance?${query.toString()}`;
  }

  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "name", label: "المطبخ" },
    { key: "received", label: "مستلم" },
    { key: "accepted", label: "مقبول" },
    { key: "rejected", label: "مرفوض" },
    { key: "noResponse", label: "بدون رد" },
    { key: "acceptanceRate", label: "نسبة القبول" },
    { key: "avgResponseMinutes", label: "متوسط الرد" },
    { key: "rating", label: "التقييم" },
    { key: "complaints", label: "الشكاوى" },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Kitchen audit
          </p>
          <h1 className="mt-2 text-3xl font-bold">أداء المطابخ</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            الأرقام من سجل ثابت: وقت رد المطبخ، سبب الرفض، وإلغاء عدم الرد.
            نسبة القبول = المقبول ÷ الطلبات المستلمة في الفترة. الرفض اليدوي
            لا يُحسب عدم رد.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
          </div>
        </header>

        <form
          className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
          method="get"
        >
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <label className="text-sm font-medium">
            من
            <input
              type="date"
              name="from"
              defaultValue={range.fromKey}
              className="mt-1 block rounded-2xl border border-zinc-300 px-4 py-2.5"
            />
          </label>
          <label className="text-sm font-medium">
            إلى
            <input
              type="date"
              name="to"
              defaultValue={range.toKey}
              className="mt-1 block rounded-2xl border border-zinc-300 px-4 py-2.5"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            عرض
          </button>
        </form>

        <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-right">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-3 py-3 font-semibold">
                    <Link href={sortHref(column.key)} className="underline-offset-4 hover:underline">
                      {column.label}
                      {sort === column.key ? (dir === "desc" ? " ↓" : " ↑") : ""}
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold">الإيقاف</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.kitchenId} className="border-t border-zinc-100">
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/admin/kitchens/${row.kitchenId}/audit?from=${range.fromKey}&to=${range.toKey}`}
                      className="font-semibold text-[var(--brand-secondary)] underline-offset-4 hover:underline"
                    >
                      {row.kitchenName}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {row.cityName} - {row.regionName}
                    </p>
                  </td>
                  <td className="px-3 py-3">{row.received}</td>
                  <td className="px-3 py-3">{row.accepted}</td>
                  <td className="px-3 py-3">{row.rejected}</td>
                  <td className="px-3 py-3">{row.noResponse}</td>
                  <td className="px-3 py-3">{formatPercent(row.acceptanceRate)}</td>
                  <td className="px-3 py-3">{formatMinutes(row.avgResponseMinutes)}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/admin/kitchens/${row.kitchenId}#reviews`}
                      className="underline-offset-4 hover:underline"
                    >
                      {row.ratingCount === 0
                        ? "—"
                        : `${row.ratingAverage?.toFixed(1) ?? "—"} (${row.ratingCount})`}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{row.complaints}</td>
                  <td className="px-3 py-3">
                    {row.suspensionLevel === "LEVEL_2"
                      ? "مستوى 2"
                      : row.suspensionLevel === "LEVEL_1"
                        ? "مستوى 1"
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
