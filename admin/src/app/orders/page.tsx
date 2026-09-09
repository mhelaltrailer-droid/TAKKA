import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";

export default async function MyOrdersPage() {
  const user = await requireAppAccount();

  const [orders, unreadNotificationsCount] = await Promise.all([
    db.order.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        kitchen: {
          select: {
            kitchenName: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.notification.count({
      where: {
        userId: user.appUserId,
        isRead: false,
      },
    }),
  ]);

  return (
    <AppShell
      mode="customer"
      userId={user.appUserId}
      unreadNotificationsCount={unreadNotificationsCount}
      title="طلباتي"
      subtitle="تابع كل طلباتك من القبول حتى الاستلام."
    >
      {orders.length === 0 ? (
        <div className="border border-[#ead9c8] bg-white p-6 text-sm leading-7 text-[#6b4a3a]">
          لا توجد طلبات بعد.{" "}
          <Link
            href="/kitchens"
            className="font-semibold text-[var(--brand-secondary)]"
          >
            استكشف المطابخ
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block border border-[#ead9c8] bg-white p-5 transition hover:border-[var(--brand-primary)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-lg font-bold">{order.kitchen.kitchenName}</p>
                  <p className="text-sm text-[#6b4a3a]">
                    {order.items.length} أصناف ·{" "}
                    {order.createdAt.toLocaleString("ar-EG")}
                  </p>
                </div>
                <span className="border border-[#ead9c8] bg-[#fff8f1] px-3 py-1 text-xs font-semibold text-[#4a2e22]">
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--brand-secondary)]">
                الإجمالي: {Number(order.totalAmount).toFixed(2)} ج.م
              </p>
            </Link>
          ))}
        </section>
      )}
    </AppShell>
  );
}
