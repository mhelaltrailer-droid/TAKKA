import Link from "next/link";
import type { KitchenJoinLeadStatus } from "@prisma/client";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  KITCHEN_JOIN_STATUSES,
  kitchenJoinSegmentLabel,
  kitchenJoinStatusLabel,
  isKitchenJoinStatus,
} from "@/lib/kitchen-join-leads";

import { LeadRowActions } from "./lead-row-actions";

function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

export default async function AdminKitchenLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; src?: string; q?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const statusFilter =
    params.status && isKitchenJoinStatus(params.status)
      ? params.status
      : undefined;
  const sourceFilter = params.src?.trim() || undefined;
  const query = params.q?.trim() || undefined;

  const [leads, newCount, statusCounts] = await Promise.all([
    db.kitchenJoinLead.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(query
          ? {
              OR: [
                { fullName: { contains: query, mode: "insensitive" } },
                { whatsapp: { contains: query } },
                { district: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    db.kitchenJoinLead.count({ where: { status: "NEW" } }),
    db.kitchenJoinLead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((row) => [row.status, row._count._all]),
  ) as Partial<Record<KitchenJoinLeadStatus, number>>;

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            تسويق · انضمام مطابخ
          </p>
          <h1 className="mt-2 text-3xl font-bold">ليدز انضمام المطابخ</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            طلبات من صفحة{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
              /join-kitchen
            </code>
            . غيّري الحالة بعد كل تواصل واتساب، واكتبي ملاحظة قصيرة إن لزم.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
            <span className="inline-flex items-center rounded-full bg-[var(--brand-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--brand-secondary)]">
              جديد: {newCount}
            </span>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-600">الحالة</span>
              <select
                name="status"
                defaultValue={statusFilter ?? ""}
                className="block rounded-xl border border-zinc-200 px-3 py-2"
              >
                <option value="">الكل</option>
                {KITCHEN_JOIN_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                    {countByStatus[item.value]
                      ? ` (${countByStatus[item.value]})`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-600">المصدر src</span>
              <input
                name="src"
                defaultValue={sourceFilter ?? ""}
                placeholder="fb_group_food"
                className="block rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-600">بحث</span>
              <input
                name="q"
                defaultValue={query ?? ""}
                placeholder="اسم / رقم / حي"
                className="block rounded-xl border border-zinc-200 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              تطبيق
            </button>
            <Link
              href="/dashboard/admin/leads"
              className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium"
            >
              مسح الفلاتر
            </Link>
          </form>
        </section>

        <section className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {leads.length === 0 ? (
            <p className="px-6 py-10 text-sm text-zinc-600">لا توجد ليدز بعد.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-right text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">الاسم</th>
                  <th className="px-4 py-3 font-semibold">الحي</th>
                  <th className="px-4 py-3 font-semibold">النوع</th>
                  <th className="px-4 py-3 font-semibold">واتساب</th>
                  <th className="px-4 py-3 font-semibold">المصدر</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-zinc-100 align-top">
                    <td className="px-4 py-3 font-medium">{lead.fullName}</td>
                    <td className="px-4 py-3">{lead.district}</td>
                    <td className="px-4 py-3">
                      {kitchenJoinSegmentLabel(lead.segment)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span dir="ltr" className="font-mono">
                          {lead.whatsapp}
                        </span>
                        <a
                          href={whatsappHref(lead.whatsapp)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--brand-secondary)] underline underline-offset-2"
                        >
                          فتح واتساب
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {lead.source ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {lead.createdAt.toLocaleString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold">
                        {kitchenJoinStatusLabel(lead.status)}
                      </span>
                      {lead.note ? (
                        <p className="mt-2 max-w-[180px] text-xs text-zinc-500">
                          {lead.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <LeadRowActions
                        id={lead.id}
                        status={lead.status}
                        note={lead.note}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
