import Link from "next/link";
import { KitchenSuspensionEnd, KitchenSuspensionLevel } from "@prisma/client";

import { requireRole } from "@/lib/auth";
import { classifyKitchenOrder, formatMinutes, formatPercent, responseMinutes } from "@/lib/kitchen-performance";
import { loadKitchenAudit } from "@/lib/kitchen-performance-report";
import { resolveStatsDateRange } from "@/lib/kitchen-order-stats";

function formatWhen(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function levelLabel(level: KitchenSuspensionLevel) {
  return level === KitchenSuspensionLevel.LEVEL_2 ? "مستوى 2" : "مستوى 1";
}

function endLabel(input: {
  endedAt: Date | null;
  endKind: KitchenSuspensionEnd | null;
  endedByName: string | null;
}) {
  if (!input.endedAt || !input.endKind) return "ما زال موقوفًا";
  if (input.endKind === KitchenSuspensionEnd.ACKNOWLEDGED) {
    return "أكّد المطبخ «فهمت»";
  }
  if (input.endKind === KitchenSuspensionEnd.UPGRADED) {
    return "ترقّى إلى مستوى أعلى";
  }
  return `إعادة تفعيل بواسطة ${input.endedByName || "مدير"}`;
}

function outcomeLabel(kind: ReturnType<typeof classifyKitchenOrder>) {
  switch (kind) {
    case "accepted":
      return "مقبول";
    case "rejected":
      return "مرفوض صراحة";
    case "no_response":
      return "بدون رد";
    case "pending":
      return "بانتظار الرد";
    default:
      return "أخرى";
  }
}

export default async function KitchenAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;
  const query = await searchParams;
  const range = resolveStatsDateRange({ from: query.from, to: query.to });
  const audit = await loadKitchenAudit(id, range);

  if (!audit) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6">
          <h1 className="text-2xl font-bold">المطبخ غير موجود</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            سجل المطبخ
          </p>
          <h1 className="mt-2 text-3xl font-bold">{audit.kitchen.kitchenName}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {audit.kitchen.region.cityName} - {audit.kitchen.region.regionName}
            {audit.kitchen.suspensionLevel
              ? ` · موقوف ${levelLabel(audit.kitchen.suspensionLevel)}`
              : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/dashboard/admin/kitchen-performance?from=${range.fromKey}&to=${range.toKey}`}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              كل المطابخ
            </Link>
            <Link
              href={`/dashboard/admin/kitchens/${audit.kitchen.id}#reviews`}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              التقييمات
            </Link>
          </div>
        </header>

        <form
          className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
          method="get"
        >
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["طلبات مستلمة", String(audit.summary.received)],
            ["مقبولة", String(audit.summary.accepted)],
            ["مرفوضة صراحة", String(audit.summary.rejected)],
            ["بدون رد", String(audit.summary.noResponse)],
            ["نسبة القبول", formatPercent(audit.summary.acceptanceRate)],
            ["متوسط زمن الرد", formatMinutes(audit.summary.avgResponseMinutes)],
            [
              "التقييم",
              audit.ratingCount === 0
                ? "—"
                : `${audit.ratingAverage?.toFixed(1) ?? "—"} (${audit.ratingCount})`,
            ],
            ["شكاوى", String(audit.complaints)],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">سجل الإيقاف</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            الصفوف لا تُمسح عند انتهاء الإيقاف. المستوى 1 ينتهي بـ «فهمت»،
            والمستوى 2 بإعادة تفعيل من الإدارة.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-right text-zinc-500">
                <tr>
                  <th className="px-2 py-2">المستوى</th>
                  <th className="px-2 py-2">السبب</th>
                  <th className="px-2 py-2">البداية</th>
                  <th className="px-2 py-2">النهاية</th>
                  <th className="px-2 py-2">كيف انتهى</th>
                </tr>
              </thead>
              <tbody>
                {audit.suspensions.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-zinc-500" colSpan={5}>
                      لا يوجد إيقاف في هذه الفترة.
                    </td>
                  </tr>
                ) : (
                  audit.suspensions.map((record) => (
                    <tr key={record.id} className="border-t border-zinc-100 align-top">
                      <td className="px-2 py-3">{levelLabel(record.level)}</td>
                      <td className="px-2 py-3 max-w-md">{record.reason}</td>
                      <td className="px-2 py-3">{formatWhen(record.startedAt)}</td>
                      <td className="px-2 py-3">{formatWhen(record.endedAt)}</td>
                      <td className="px-2 py-3">
                        {endLabel({
                          endedAt: record.endedAt,
                          endKind: record.endKind,
                          endedByName:
                            record.endedBy?.fullName || record.endedBy?.email || null,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">قرارات الطلبات</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-right text-zinc-500">
                <tr>
                  <th className="px-2 py-2">الطلب</th>
                  <th className="px-2 py-2">وصل</th>
                  <th className="px-2 py-2">النتيجة</th>
                  <th className="px-2 py-2">زمن الرد</th>
                  <th className="px-2 py-2">سبب الرفض</th>
                </tr>
              </thead>
              <tbody>
                {audit.orders.map((order) => {
                  const kind = classifyKitchenOrder(order);
                  return (
                    <tr key={order.id} className="border-t border-zinc-100">
                      <td className="px-2 py-3">{order.orderNumber}</td>
                      <td className="px-2 py-3">{formatWhen(order.placedAt)}</td>
                      <td className="px-2 py-3">{outcomeLabel(kind)}</td>
                      <td className="px-2 py-3">
                        {formatMinutes(responseMinutes(order))}
                      </td>
                      <td className="px-2 py-3">
                        {order.kitchenRejectReason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
