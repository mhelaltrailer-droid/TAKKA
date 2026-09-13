import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";
import { getDeliveryTypeLabel } from "@/lib/status-labels";

type SearchParams = Promise<{
  q?: string;
}>;

export default async function AdminChatArchivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const orders = await db.order.findMany({
    where: q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            {
              customer: {
                fullName: { contains: q, mode: "insensitive" },
              },
            },
            {
              customer: {
                phoneNumber: { contains: q, mode: "insensitive" },
              },
            },
            {
              kitchen: {
                kitchenName: { contains: q, mode: "insensitive" },
              },
            },
          ],
        }
      : undefined,
    orderBy: { placedAt: "desc" },
    take: 100,
    include: {
      customer: {
        select: {
          fullName: true,
          phoneNumber: true,
        },
      },
      kitchen: {
        select: {
          kitchenName: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--brand-secondary)]">
                أرشيف المحادثات
              </p>
              <h1 className="mt-2 text-3xl font-bold">محادثات العملاء والمطابخ</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600">
                مرجع للإدارة عند النزاعات: كل حالات الطلب مع سجل المحادثة
                والصور، مع إمكانية التصدير إلى PDF.
              </p>
            </div>
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              العودة للإدارة
            </Link>
          </div>

          <form className="mt-5 flex flex-wrap gap-3" method="get">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="بحث برقم الطلب / العميل / الهاتف / المطبخ"
              className="min-w-[260px] flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white"
            >
              بحث
            </button>
            {q ? (
              <Link
                href="/dashboard/admin/chats"
                className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium"
              >
                مسح البحث
              </Link>
            ) : null}
          </form>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">قائمة الطلبات</h2>
            <p className="text-xs text-zinc-500">
              عرض حتى 100 طلب{q ? " مطابقة للبحث" : " الأحدث"}
            </p>
          </div>

          {orders.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
              لا توجد طلبات مطابقة.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/admin/chats/${order.id}`}
                  className="block rounded-2xl border border-zinc-200 px-4 py-4 transition hover:border-[var(--brand-primary)] hover:bg-orange-50/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">{order.orderNumber}</p>
                    <StatusPill
                      label={getOrderStatusLabel(order.status)}
                      tone="info"
                    />
                    <StatusPill
                      label={getDeliveryTypeLabel(order.deliveryType)}
                      tone="warning"
                    />
                    <span className="text-xs text-zinc-500">
                      {order._count.messages} رسالة
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2">
                    <p>العميل: {order.customer.fullName || "غير محدد"}</p>
                    <p>المطبخ: {order.kitchen.kitchenName}</p>
                    <p>هاتف: {order.customer.phoneNumber || "—"}</p>
                    <p>
                      التاريخ:{" "}
                      {new Intl.DateTimeFormat("ar-EG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(order.placedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
